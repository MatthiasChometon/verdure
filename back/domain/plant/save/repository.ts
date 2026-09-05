import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import {
  DATABASE,
  type Database,
} from '../../../infrastructure/database/token';
import { LatestWatering } from '../latest-watering';
import { Plant } from '../model';
import { PlantMapper } from '../plant-mapper';
import { plant } from '../schema';
import { PlantEmbeddingWriter } from './embedding-writer';
import { CreatePlantInput, UpdatePlantInput } from './input';

@Injectable()
export class SaveRepository {
  constructor(
    @Inject(DATABASE) private readonly database: Database,
    private readonly latest: LatestWatering,
    private readonly plantMapper: PlantMapper,
    private readonly embeddingWriter: PlantEmbeddingWriter,
  ) {}

  async create(userId: string, input: CreatePlantInput): Promise<Plant> {
    const description = input.description ?? null;
    const [created] = await this.database
      .insert(plant)
      .values({
        userId,
        name: input.name,
        species: input.species,
        description,
        imageKey: input.imageKey ?? null,
        wateringIntervalSummerDays: input.wateringIntervalSummerDays ?? null,
        wateringIntervalWinterDays: input.wateringIntervalWinterDays ?? null,
        embedding: null,
      })
      .returning();
    // Embed in the background — the save returns immediately.
    this.embeddingWriter.schedule(
      created.id,
      userId,
      input.name,
      input.species,
      description,
    );
    // A brand-new plant has no watering event yet.
    return this.plantMapper.toPlant({
      id: created.id,
      name: created.name,
      species: created.species,
      description: created.description,
      imageKey: created.imageKey,
      wateringIntervalSummerDays: created.wateringIntervalSummerDays,
      wateringIntervalWinterDays: created.wateringIntervalWinterDays,
      lastWateredOn: null,
    });
  }

  async update(userId: string, input: UpdatePlantInput): Promise<Plant> {
    const values = this.buildUpdateValues(input);
    const [updated] = await this.database
      .update(plant)
      .set(values)
      .where(and(eq(plant.id, input.id), eq(plant.userId, userId)))
      .returning({ id: plant.id });
    if (updated === undefined) {
      throw new NotFoundException('Plant not found.');
    }
    // Re-embed in the background — the update returns immediately.
    this.embeddingWriter.schedule(
      input.id,
      userId,
      input.name,
      input.species,
      input.description ?? null,
    );
    // The row select needs the joined lastWateredOn, which `returning()` above
    // cannot provide — a second read is the simplest way to get it.
    const result = await this.findById(userId, input.id);
    if (result === undefined) {
      throw new NotFoundException('Plant not found.');
    }
    return result;
  }

  // Watering intervals follow the null-vs-undefined convention: null disables tracking
  // for that season, undefined leaves it as-is.
  private buildUpdateValues(
    input: UpdatePlantInput,
  ): Partial<typeof plant.$inferInsert> {
    const values: Partial<typeof plant.$inferInsert> = {
      name: input.name,
      species: input.species,
      description: input.description ?? null,
    };
    if (input.imageKey !== null && input.imageKey !== undefined) {
      values.imageKey = input.imageKey;
    }
    if (input.wateringIntervalSummerDays !== undefined) {
      values.wateringIntervalSummerDays = input.wateringIntervalSummerDays;
    }
    if (input.wateringIntervalWinterDays !== undefined) {
      values.wateringIntervalWinterDays = input.wateringIntervalWinterDays;
    }
    return values;
  }

  async delete(
    userId: string,
    id: string,
  ): Promise<{ imageKey: string | null } | undefined> {
    // watering_event rows cascade-delete with the plant (FK onDelete: cascade).
    const [deleted] = await this.database
      .delete(plant)
      .where(and(eq(plant.id, id), eq(plant.userId, userId)))
      .returning({ imageKey: plant.imageKey });
    return deleted;
  }

  // Every plant name the user already owns, used to guarantee a suggested
  // nickname is not a duplicate.
  async namesOf(userId: string): Promise<string[]> {
    const rows = await this.database
      .select({ name: plant.name })
      .from(plant)
      .where(eq(plant.userId, userId));
    return rows.map((row) => row.name);
  }

  async findById(userId: string, id: string): Promise<Plant | undefined> {
    const latest = this.latest.query();
    const [row] = await this.database
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
      .where(and(eq(plant.id, id), eq(plant.userId, userId)))
      .limit(1);
    if (row === undefined) {
      return;
    }
    return this.plantMapper.toPlant(row);
  }
}
