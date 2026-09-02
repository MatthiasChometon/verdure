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
import { PlantSearchService } from './search.service';
import { Relevance } from './type';

// First word of the species is treated as the genus ("Monstera deliciosa").
const genusExpression = sql<string>`lower(split_part(${plant.species}, ' ', 1))`;

@Injectable()
export class ListRepository {
  constructor(
    @Inject(DATABASE) private readonly database: Database,
    private readonly embedding: SemanticEmbeddingService,
    private readonly latest: LatestWatering,
    private readonly wateringSchedule: WateringScheduleService,
    private readonly search: PlantSearchService,
  ) {}

  async findPage(userId: string, args: PlantsArgs): Promise<PlantPage> {
    const relevance = await this.search.relevanceFor(args);
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
        ? [this.search.semanticOrder(semantic), asc(plant.id)]
        : args.sort === PlantSortField.WATERING
          ? [
              sql`${this.nextDueExpression(latest)} asc nulls last`,
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
    const now = new Date();
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
      winterRest: this.wateringSchedule.winterRest(
        now,
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
    const nextDue = this.nextDueExpression(latest);
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
    const now = new Date();
    return rows.map((row) => ({
      ...row,
      nextDueOn: this.wateringSchedule.nextDue(
        row.lastWateredOn,
        row.wateringIntervalSummerDays,
        row.wateringIntervalWinterDays,
      ),
      winterRest: this.wateringSchedule.winterRest(
        now,
        row.wateringIntervalWinterDays,
      ),
    }));
  }

  // Facet counts reflect the owner + search only (not the genus/hasImage
  // filters) so every option stays visible with its count.
  async facets(userId: string, args: PlantsArgs): Promise<PlantFacets> {
    const relevance = await this.search.relevanceFor(args);
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

  // SQL mirror of WateringScheduleService.nextDue(): last watering + its season
  // interval, stretched by the seasonal factor (deep dormancy Dec–Feb ×1.5,
  // shoulder months Mar/Oct/Nov ×1.2, growing season ×1). Kept in step with the
  // pure service so sorting and the "due today" band match the shown due date.
  private nextDueExpression(latest: ReturnType<LatestWatering['query']>): SQL {
    const lastWateredOn = latest.lastWateredOn;
    const interval = sql`(case when extract(month from ${lastWateredOn}) between 4 and 9 then ${plant.wateringIntervalSummerDays} else ${plant.wateringIntervalWinterDays} end)`;
    const factor = sql`(case when extract(month from ${lastWateredOn}) in (12, 1, 2) then 1.5 when extract(month from ${lastWateredOn}) in (3, 10, 11) then 1.2 else 1 end)`;
    return sql`(${lastWateredOn} + round(${interval} * ${factor})::int)`;
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
