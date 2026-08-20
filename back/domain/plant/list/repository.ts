import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type SQL, and, asc, desc, eq, sql } from 'drizzle-orm';
import {
  DATABASE,
  type Database,
} from '../../../infrastructure/database/token';
import { AiService } from '../../../infrastructure/ai/service';
import { LatestWatering } from '../latest-watering';
import { plant } from '../schema';
import { WateringScheduleService } from '../watering/schedule.service';
import { PlantsArgs } from './args';
import { PlantSortField, SortDirection } from './enum';
import { PlantFacets } from './facets';
import { PlantPage } from './page';
import { Relevance } from './type';

// First word of the species is treated as the genus ("Monstera deliciosa").
const genusExpression = sql<string>`lower(split_part(${plant.species}, ' ', 1))`;

// Below this trigram word-similarity a match is considered noise.
const SIMILARITY_THRESHOLD = 0.3;

@Injectable()
export class ListRepository {
  // On an old Postgres (no pg_trgm/unaccent/tsvector — e.g. 9.6) the search
  // degrades to a plain ILIKE. Advanced (the default) keeps the ranked,
  // typo-tolerant, accent-folded one.
  private readonly simpleSearch: boolean;

  constructor(
    @Inject(DATABASE) private readonly database: Database,
    private readonly ai: AiService,
    private readonly latest: LatestWatering,
    private readonly wateringSchedule: WateringScheduleService,
    config: ConfigService,
  ) {
    this.simpleSearch = config.get('SEARCH_MODE') === 'simple';
  }

  async findPage(userId: string, args: PlantsArgs): Promise<PlantPage> {
    const relevance = this.relevanceFor(args);
    // Semantic sort embeds the query; if the query is empty or Ollama is
    // unreachable we fall back to keyword relevance.
    const search = args.search?.trim();
    const semantic =
      !this.simpleSearch &&
      args.sort === PlantSortField.SEMANTIC &&
      search !== undefined &&
      search !== ''
        ? await this.ai.embed(search)
        : undefined;

    const latest = this.latest.query();
    const where = and(
      eq(plant.userId, userId),
      // Semantic ranks the whole collection, so it skips the keyword filter.
      semantic !== undefined ? undefined : relevance?.where,
      ...this.filters(args),
    );
    // Watering sort needs the joined last-watering column, so it is built here;
    // everything else goes through buildOrder. The next-due expression mirrors
    // WateringScheduleService.nextDue(). Most-overdue first, untracked plants last.
    const order =
      semantic !== undefined
        ? [this.semanticOrder(semantic), asc(plant.id)]
        : args.sort === PlantSortField.WATERING
          ? [
              sql`(${latest.lastWateredOn} + (case when extract(month from ${latest.lastWateredOn}) between 4 and 9 then ${plant.wateringIntervalSummerDays} else ${plant.wateringIntervalWinterDays} end)) asc nulls last`,
              asc(plant.id),
            ]
          : this.buildOrder(args, relevance);

    // Single round-trip: the window `count(*) over()` reports the filtered
    // total (before limit/offset) alongside the page rows. The latest-watering
    // join is 1:1 (grouped by plant), so it does not inflate the count.
    const rows = await this.database
      .select({
        id: plant.id,
        name: plant.name,
        species: plant.species,
        description: plant.description,
        imageKey: plant.imageKey,
        wateringIntervalSummerDays: plant.wateringIntervalSummerDays,
        wateringIntervalWinterDays: plant.wateringIntervalWinterDays,
        lastWateredOn: latest.lastWateredOn,
        total: sql<number>`count(*) over()`.mapWith(Number),
      })
      .from(plant)
      .leftJoin(latest, eq(latest.plantId, plant.id))
      .where(where)
      .orderBy(...order)
      .limit(args.limit)
      .offset(args.offset);

    const total = rows[0]?.total ?? 0;
    const items = rows.map((row) => ({
      id: row.id,
      name: row.name,
      species: row.species,
      description: row.description,
      imageKey: row.imageKey,
      wateringIntervalSummerDays: row.wateringIntervalSummerDays,
      wateringIntervalWinterDays: row.wateringIntervalWinterDays,
      lastWateredOn: row.lastWateredOn,
      nextDueOn: this.wateringSchedule.nextDue(
        row.lastWateredOn,
        row.wateringIntervalSummerDays,
        row.wateringIntervalWinterDays,
      ),
    }));

    return { items, total };
  }

  // Facet counts reflect the owner + search only (not the genus/hasImage
  // filters) so every option stays visible with its count.
  async facets(userId: string, args: PlantsArgs): Promise<PlantFacets> {
    const relevance = this.relevanceFor(args);
    const scope = and(eq(plant.userId, userId), relevance?.where);

    const [genera, [photo]] = await Promise.all([
      this.database
        .select({
          value: genusExpression,
          count: sql<number>`count(*)`.mapWith(Number),
        })
        .from(plant)
        .where(scope)
        .groupBy(genusExpression)
        .orderBy(desc(sql`count(*)`), asc(genusExpression))
        .limit(30),
      this.database
        .select({
          withImage:
            sql<number>`count(*) filter (where ${plant.imageKey} is not null)`.mapWith(
              Number,
            ),
          withoutImage:
            sql<number>`count(*) filter (where ${plant.imageKey} is null)`.mapWith(
              Number,
            ),
        })
        .from(plant)
        .where(scope),
    ]);

    return {
      genera,
      withImage: photo?.withImage ?? 0,
      withoutImage: photo?.withoutImage ?? 0,
    };
  }

  private relevanceFor(args: PlantsArgs): Relevance | undefined {
    const search = args.search?.trim();
    return search !== undefined && search !== ''
      ? this.buildRelevance(search)
      : undefined;
  }

  private filters(args: PlantsArgs): SQL[] {
    const conditions: SQL[] = [];
    if (args.genus !== undefined && args.genus !== '') {
      conditions.push(sql`${genusExpression} = lower(${args.genus})`);
    }
    if (args.hasImage !== undefined) {
      conditions.push(
        args.hasImage
          ? sql`${plant.imageKey} is not null`
          : sql`${plant.imageKey} is null`,
      );
    }
    return conditions;
  }

  // ILIKE fallback for an old Postgres: case-insensitive substring, no typo
  // tolerance and no accent folding (both need extensions absent from 9.6).
  private simpleRelevance(search: string): Relevance {
    const escaped = search.replace(/[\\%_]/g, '\\$&');
    const contains = `%${escaped}%`;
    const prefix = `${escaped}%`;
    return {
      where: sql`(${plant.name} ilike ${contains} or ${plant.species} ilike ${contains})`,
      // A starts-with match ranks above a mere substring; ties fall back to id.
      rank: sql`(case when ${plant.name} ilike ${prefix} or ${plant.species} ilike ${prefix} then 1 else 0 end)`,
    };
  }

  // Full-text (prefix) matching for relevance + trigram word-similarity so a
  // typo like "montera" still finds "Monstera".
  private buildRelevance(search: string): Relevance {
    if (this.simpleSearch) {
      return this.simpleRelevance(search);
    }
    // unaccent both sides so "med" matches "Médore" (é vs e). The tsquery below
    // stays accent-sensitive; this fuzzy branch covers the accent-folded case.
    const nameSimilarity = sql`word_similarity(unaccent(${search}), unaccent(${plant.name}))`;
    const speciesSimilarity = sql`word_similarity(unaccent(${search}), unaccent(${plant.species}))`;
    const fuzzyMatch = sql`(${nameSimilarity} > ${SIMILARITY_THRESHOLD} or ${speciesSimilarity} > ${SIMILARITY_THRESHOLD})`;
    const bestSimilarity = sql`greatest(${nameSimilarity}, ${speciesSimilarity})`;

    // Turn the input into a prefix tsquery ("mons del" -> "mons:* & del:*"),
    // stripping anything that is not a letter or digit to stay injection-safe.
    const tsqueryString = search
      .split(/\s+/)
      .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ''))
      .filter((word) => word.length > 0)
      .map((word) => `${word}:*`)
      .join(' & ');

    if (tsqueryString === '') {
      return { where: fuzzyMatch, rank: bestSimilarity };
    }

    const query = sql`to_tsquery('simple', ${tsqueryString})`;
    return {
      where: sql`(${plant.searchVector} @@ ${query} or ${fuzzyMatch})`,
      rank: sql`ts_rank(${plant.searchVector}, ${query}) + ${bestSimilarity}`,
    };
  }

  // Embeddings are unit-normalised, so cosine similarity is a plain dot
  // product; un-embedded plants sort last.
  private semanticOrder(embedding: number[]): SQL {
    const literal = `{${embedding.join(',')}}`;
    return sql`cosine_similarity(${plant.embedding}, ${literal}::real[]) desc nulls last`;
  }

  // WATERING is handled in findPage (it needs the joined last-watering column).
  private buildOrder(
    args: PlantsArgs,
    relevance: Relevance | undefined,
  ): SQL[] {
    if (
      args.sort === PlantSortField.RELEVANCE ||
      args.sort === PlantSortField.SEMANTIC
    ) {
      // Order by relevance while searching; fall back to newest-first when
      // simply browsing the collection.
      const primary =
        relevance !== undefined ? desc(relevance.rank) : desc(plant.createdAt);
      return [primary, asc(plant.id)];
    }

    const column = {
      [PlantSortField.RELEVANCE]: plant.createdAt,
      [PlantSortField.SEMANTIC]: plant.createdAt,
      [PlantSortField.NAME]: plant.name,
      [PlantSortField.SPECIES]: plant.species,
      [PlantSortField.CREATED_AT]: plant.createdAt,
      [PlantSortField.WATERING]: plant.createdAt,
    }[args.sort];
    const primary =
      args.direction === SortDirection.DESC ? desc(column) : asc(column);
    return [primary, asc(plant.id)];
  }
}
