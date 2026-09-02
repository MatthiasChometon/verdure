import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import {
  DATABASE,
  type Database,
} from '../../../infrastructure/database/token';
import { plant } from '../schema';
import { CareDueService } from './due.service';
import { CareType } from './enum';
import {
  LogCareInput,
  RemoveCareScheduleInput,
  SetCareScheduleInput,
} from './input';
import { CareSchedule } from './model';
import { careSchedule } from './schema';
import { CareScheduleRecord } from './type';

@Injectable()
export class CareRepository {
  constructor(
    @Inject(DATABASE) private readonly database: Database,
    private readonly due: CareDueService,
  ) {}

  // A plant's care routines, one per configured type, ordered stably. Scoped to
  // the owner: a plant the user does not own simply yields nothing.
  async schedulesFor(userId: string, plantId: string): Promise<CareSchedule[]> {
    const rows = await this.database
      .select({
        id: careSchedule.id,
        careType: careSchedule.careType,
        intervalDays: careSchedule.intervalDays,
        lastDoneOn: careSchedule.lastDoneOn,
      })
      .from(careSchedule)
      .where(
        and(eq(careSchedule.plantId, plantId), eq(careSchedule.userId, userId)),
      )
      .orderBy(asc(careSchedule.careType));
    return rows.map((row) => this.toModel(row));
  }

  // Every care routine a user owns, with its plant's name — feeds the reminder
  // scheduler; the pure CareDueService decides which are actually due today.
  async careRecordsFor(userId: string): Promise<CareScheduleRecord[]> {
    const rows = await this.database
      .select({
        plantId: careSchedule.plantId,
        plantName: plant.name,
        careType: careSchedule.careType,
        intervalDays: careSchedule.intervalDays,
        lastDoneOn: careSchedule.lastDoneOn,
      })
      .from(careSchedule)
      .innerJoin(plant, eq(plant.id, careSchedule.plantId))
      .where(eq(careSchedule.userId, userId));
    return rows.map((row) => ({ ...row, careType: row.careType as CareType }));
  }

  async set(
    userId: string,
    input: SetCareScheduleInput,
  ): Promise<CareSchedule> {
    await this.assertOwnsPlant(userId, input.plantId);
    const [row] = await this.database
      .insert(careSchedule)
      .values({
        plantId: input.plantId,
        userId,
        careType: input.careType,
        intervalDays: input.intervalDays,
      })
      .onConflictDoUpdate({
        target: [careSchedule.plantId, careSchedule.careType],
        set: { intervalDays: input.intervalDays },
      })
      .returning({
        id: careSchedule.id,
        careType: careSchedule.careType,
        intervalDays: careSchedule.intervalDays,
        lastDoneOn: careSchedule.lastDoneOn,
      });
    return this.toModel(row);
  }

  async logCare(userId: string, input: LogCareInput): Promise<CareSchedule> {
    const doneOn = input.doneOn ?? new Date().toISOString().slice(0, 10);
    const [updated] = await this.database
      .update(careSchedule)
      .set({ lastDoneOn: doneOn })
      .where(
        and(
          eq(careSchedule.plantId, input.plantId),
          eq(careSchedule.careType, input.careType),
          eq(careSchedule.userId, userId),
        ),
      )
      .returning({
        id: careSchedule.id,
        careType: careSchedule.careType,
        intervalDays: careSchedule.intervalDays,
        lastDoneOn: careSchedule.lastDoneOn,
      });
    if (updated === undefined) {
      throw new NotFoundException('Care schedule not found.');
    }
    return this.toModel(updated);
  }

  async remove(
    userId: string,
    input: RemoveCareScheduleInput,
  ): Promise<boolean> {
    const [deleted] = await this.database
      .delete(careSchedule)
      .where(
        and(
          eq(careSchedule.plantId, input.plantId),
          eq(careSchedule.careType, input.careType),
          eq(careSchedule.userId, userId),
        ),
      )
      .returning({ id: careSchedule.id });
    return deleted !== undefined;
  }

  private async assertOwnsPlant(
    userId: string,
    plantId: string,
  ): Promise<void> {
    const [owned] = await this.database
      .select({ id: plant.id })
      .from(plant)
      .where(and(eq(plant.id, plantId), eq(plant.userId, userId)))
      .limit(1);
    if (owned === undefined) {
      throw new NotFoundException('Plant not found.');
    }
  }

  private toModel(row: {
    id: string;
    careType: string;
    intervalDays: number;
    lastDoneOn: string | null;
  }): CareSchedule {
    return {
      id: row.id,
      careType: row.careType as CareType,
      intervalDays: row.intervalDays,
      lastDoneOn: row.lastDoneOn,
      nextDueOn: this.due.nextDueOn(row.lastDoneOn, row.intervalDays),
    };
  }
}
