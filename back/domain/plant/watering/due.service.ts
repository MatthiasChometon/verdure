import { Injectable } from '@nestjs/common';
import { WateringScheduleService } from './schedule.service';
import { DuePlant, PlantWateringRecord } from './type';

// Pure watering-due logic: given a user's plants and a day, which ones need
// water. A plant is due when it is tracked (has an interval) and its next-due
// date is on or before that day. No I/O — the repository feeds it rows, the
// scheduler feeds it "today", and it is unit-tested on both.
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
