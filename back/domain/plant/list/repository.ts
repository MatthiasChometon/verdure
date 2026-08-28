import { Inject, Injectable } from '@nestjs/common';
import { type SQL, and, asc, desc, eq, sql } from 'drizzle-orm';
import {
  DATABASE,
  type Database,
} from '../../../infrastructure/database/token';
import { SemanticEmbeddingService } from '../../aiWorker/embedding/service';
import { LatestWatering } from '../latest-watering';
import { Plant } from '../model';
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
  // Advanced keyword search (trigram word-similarity + unaccent) needs Postgres
  // extensions an old server lacks (e.g. 9.6, where they aren't even installed).
  // Detected at runtime — once, memoised — rather than a static SEARCH_MODE flag,
  // so each deployment uses the best search its database actually supports. Until
  // the probe resolves we assume the safe accent-folded ILIKE.
  private simpleSearch = true;
  private advancedProbe: Promise<boolean> | undefined;

  constructor(
    @Inject(DATABASE) private readonly database: Database,
    private readonly embedding: SemanticEmbeddingService,
    private readonly latest: LatestWatering,
    private readonly wateringSchedule: WateringScheduleService,
  ) {}

  private async detectMode(): Promise<void> {
    this.advancedProbe ??= this.probeAdvanced();
    this.simpleSearch = !(await this.advancedProbe);
  }

  // word_similarity (pg_trgm) and unaccent are the two features the advanced
  // relevance relies on; if either is missing the query throws and we stay simple.
  private async probeAdvanced(): Promise<boolean> {
    try {
      await this.database.execute(
        sql`select unaccent('x'), word_similarity('x', 'x')`,
      );
      return true;
    } catch {
      return false;
    }
  }

  async findPage(userId: string, args: PlantsArgs): Promise<PlantPage> {
    // Settle the keyword mode (simple vs advanced) before building relevance.
    await this.detectMode();
    const relevance = this.relevanceFor(args);
    // Semantic sort ranks the whole collection by the query's embedding. The
    // vector comes from a co-located embedder (local full-stack) or, on the
    // public deploy, the user's worker via the queue — which is async, so it can
    // be `pending`: we then rank by keyword for now and tell the front to retry.
    const search = args.search?.trim();
    let semantic: number[] | undefined;
    let semanticPending = false;
    if (
      args.sort === PlantSortField.SEMANTIC &&
      search !== undefined &&
      search !== ''
    ) {
      const resolved = await this.embedding.resolveQueryEmbedding(
        userId,
        search,
      );
      semantic = resolved.vector;
      semanticPending = resolved.pending;
    }

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

    return { items, total, semanticPending };
  }

  // Plants that need watering today or are overdue (next-due date on or before
  // today), most overdue first. Powers the "to water today" band — and, later,
  // the reminders. Untracked / never-watered plants have no next-due, so they are
  // excluded (the comparison is null).
  async findDue(userId: string): Promise<Plant[]> {
    const latest = this.latest.query();
    const nextDue = sql`(${latest.lastWateredOn} + (case when extract(month from ${latest.lastWateredOn}) between 4 and 9 then ${plant.wateringIntervalSummerDays} else ${plant.wateringIntervalWinterDays} end))`;
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
      })
      .from(plant)
      .leftJoin(latest, eq(latest.plantId, plant.id))
      .where(and(eq(plant.userId, userId), sql`${nextDue} <= current_date`))
      .orderBy(sql`${nextDue} asc`, asc(plant.id))
      .limit(50);
    return rows.map((row) => ({
      ...row,
      nextDueOn: this.wateringSchedule.nextDue(
        row.lastWateredOn,
        row.wateringIntervalSummerDays,
        row.wateringIntervalWinterDays,
      ),
    }));
  }

  // Facet counts reflect the owner + search only (not the genus/hasImage
  // filters) so every option stays visible with its count.
  async facets(userId: string, args: PlantsArgs): Promise<PlantFacets> {
    await this.detectMode();
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

  // Common Latin diacritics folded to ASCII, char-for-char (translate maps by
  // position, so the two strings must stay the same length). Lets an old Postgres
  // fold accents with core `translate()` — no unaccent extension needed.
  private static readonly ACCENTS_FROM = 'àáâãäåçèéêëìíîïñòóôõöùúûüýÿ';
  private static readonly ACCENTS_TO = 'aaaaaaceeeeiiiinooooouuuuyy';

  // Fallback for an old Postgres (no pg_trgm/unaccent): accent-insensitive,
  // case-insensitive substring so "reglisse" and "régl" both find "Réglisse".
  // No typo tolerance (that needs pg_trgm) — a query must be a real substring.
  private simpleRelevance(search: string): Relevance {
    // Fold the query the same way the columns are folded (strip diacritics,
    // lowercase), then escape LIKE wildcards.
    const folded = search
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[\\%_]/g, '\\$&');
    const contains = `%${folded}%`;
    const prefix = `${folded}%`;
    const from = ListRepository.ACCENTS_FROM;
    const to = ListRepository.ACCENTS_TO;
    const name = sql`translate(lower(${plant.name}), ${from}, ${to})`;
    const species = sql`translate(lower(${plant.species}), ${from}, ${to})`;
    return {
      where: sql`(${name} like ${contains} or ${species} like ${contains})`,
      // A starts-with match ranks above a mere substring; ties fall back to id.
      rank: sql`(case when ${name} like ${prefix} or ${species} like ${prefix} then 1 else 0 end)`,
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
