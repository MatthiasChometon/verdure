import { Injectable } from '@nestjs/common';
import { CareScheduleRecord, DueCareTask } from './type';

// Pure care-due logic: given a user's care schedules and a day, which tasks need
// doing. A task is due when it has been done at least once (so there is a cycle
// to measure from) and its next-due date is on or before that day. No I/O — the
// repository feeds it rows, the scheduler feeds it "today", and it is unit-tested
// on both. Unlike watering, care intervals are flat (no seasonal stretching).
@Injectable()
export class CareDueService {
  dueTasks(records: CareScheduleRecord[], today: string): DueCareTask[] {
    return records
      .map((record) => this.toDueTask(record, today))
      .filter((task): task is DueCareTask => task !== null);
  }

  // Next-due date = last done + interval. Null when never done, so a fresh
  // schedule never nags before the owner marks it done once.
  nextDueOn(lastDoneOn: string | null, intervalDays: number): string | null {
    if (lastDoneOn === null) {
      return null;
    }
    const last = new Date(`${lastDoneOn}T00:00:00Z`);
    if (Number.isNaN(last.getTime())) {
      return null;
    }
    last.setUTCDate(last.getUTCDate() + intervalDays);
    return last.toISOString().slice(0, 10);
  }

  private toDueTask(
    record: CareScheduleRecord,
    today: string,
  ): DueCareTask | null {
    const dueOn = this.nextDueOn(record.lastDoneOn, record.intervalDays);
    if (dueOn === null || dueOn > today) {
      return null;
    }
    return {
      plantId: record.plantId,
      plantName: record.plantName,
      careType: record.careType,
      dueOn,
    };
  }
}
