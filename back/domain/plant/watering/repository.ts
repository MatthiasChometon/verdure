import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, gte, lte } from 'drizzle-orm';
import {
  DATABASE,
  type Database,
} from '../../../infrastructure/database/token';
import { Plant } from '../model';
import { SaveRepository } from '../save/repository';
import { plant } from '../schema';
import { WateringDefault } from './default.model';
import { WateringEvent } from './event.model';
import { WaterPlantInput } from './input';
import { wateringDefault, wateringEvent } from './schema';

// Fallback schedule when the plant's genus is not in the curated table.
const GENERIC_WATERING: WateringDefault = { summerDays: 7, winterDays: 14 };

@Injectable()
export class WateringRepository {
  constructor(
    @Inject(DATABASE) private readonly database: Database,
    private readonly save: SaveRepository,
  ) {}

  async water(userId: string, input: WaterPlantInput): Promise<Plant> {
    const wateredOn = input.wateredOn ?? new Date().toISOString().slice(0, 10);
    const [owned] = await this.database
      .select({ id: plant.id })
      .from(plant)
      .where(and(eq(plant.id, input.plantId), eq(plant.userId, userId)))
      .limit(1);
    if (owned === undefined) {
      throw new NotFoundException('Plant not found.');
    }
    // Idempotent: watering a plant again on the same day is a no-op.
    await this.database
      .insert(wateringEvent)
      .values({ plantId: input.plantId, userId, wateredOn })
      .onConflictDoNothing();
    const watered = await this.save.findById(userId, input.plantId);
    if (watered === undefined) {
      throw new NotFoundException('Plant not found.');
    }
    return watered;
  }

  // Suggested seasonal intervals for a species, by its genus (first word),
  // falling back to a generic schedule for unknown genera.
  async wateringDefault(species: string): Promise<WateringDefault> {
    const genus = species.trim().split(/\s+/)[0]?.toLowerCase() ?? '';
    if (genus === '') {
      return GENERIC_WATERING;
    }
    const [row] = await this.database
      .select({
        summerDays: wateringDefault.summerDays,
        winterDays: wateringDefault.winterDays,
      })
      .from(wateringDefault)
      .where(eq(wateringDefault.genus, genus))
      .limit(1);
    return row ?? GENERIC_WATERING;
  }

  async removeWateringEvent(userId: string, id: string): Promise<boolean> {
    const [deleted] = await this.database
      .delete(wateringEvent)
      .where(and(eq(wateringEvent.id, id), eq(wateringEvent.userId, userId)))
      .returning({ id: wateringEvent.id });
    return deleted !== undefined;
  }

  wateringEvents(
    userId: string,
    from: string,
    to: string,
  ): Promise<WateringEvent[]> {
    return this.database
      .select({
        id: wateringEvent.id,
        plantId: wateringEvent.plantId,
        plantName: plant.name,
        wateredOn: wateringEvent.wateredOn,
      })
      .from(wateringEvent)
      .innerJoin(plant, eq(plant.id, wateringEvent.plantId))
      .where(
        and(
          eq(wateringEvent.userId, userId),
          gte(wateringEvent.wateredOn, from),
          lte(wateringEvent.wateredOn, to),
        ),
      )
      .orderBy(asc(wateringEvent.wateredOn), asc(plant.name));
  }
}
