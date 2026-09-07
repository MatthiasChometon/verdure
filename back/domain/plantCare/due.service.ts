import { Injectable } from '@nestjs/common';
import { CareScheduleRecord, DueCareTask } from './type';

// Pure logic (no I/O): a task is due once done at least once and its next-due date has arrived.
// Unlike watering, care intervals are flat — no seasonal stretching.
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
