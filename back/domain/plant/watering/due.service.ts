import { Injectable } from '@nestjs/common';
import { WateringScheduleService } from './schedule.service';
import { DuePlant, PlantWateringRecord } from './type';

// Pure logic (no I/O): a plant is due once tracked (has an interval) and its next-due
// date has arrived.
@Injectable()
export class WateringDueService {
  constructor(private readonly schedule: WateringScheduleService) {}

  duePlants(records: PlantWateringRecord[], today: string): DuePlant[] {
    return records
      .map((record) => this.toDuePlant(record, today))
      .filter((plant): plant is DuePlant => plant !== null);
  }

  private toDuePlant(
    record: PlantWateringRecord,
    today: string,
  ): DuePlant | null {
    const dueOn = this.schedule.nextDue(
      record.lastWateredOn,
      record.summerDays,
      record.winterDays,
    );
    if (dueOn === null || dueOn > today) {
      return null;
    }
    return { id: record.id, name: record.name, dueOn };
  }
}
