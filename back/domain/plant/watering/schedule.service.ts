import { Injectable } from '@nestjs/common';
import { WateringSeason } from './type';

@Injectable()
export class WateringScheduleService {
  // Growing season (April–September) needs more frequent watering than the
  // dormant season (October–March). Dates are pure (no time) → read UTC month.
  season(date: Date): WateringSeason {
    const month = date.getUTCMonth() + 1;
    return month >= 4 && month <= 9 ? 'summer' : 'winter';
  }

  // Next due date = last watering + the interval of the season it happened in.
  // Null when the plant is not tracked for that season. Kept in sync with the
  // SQL expression used for list sorting in the repository.
  nextDue(
    lastWateredOn: string | null,
    summerDays: number | null,
    winterDays: number | null,
  ): string | null {
    if (lastWateredOn === null) {
      return null;
    }
    const last = new Date(`${lastWateredOn}T00:00:00Z`);
    if (Number.isNaN(last.getTime())) {
      return null;
    }
    const interval = this.season(last) === 'summer' ? summerDays : winterDays;
    if (interval === null) {
      return null;
    }
    const due = new Date(last);
    due.setUTCDate(due.getUTCDate() + interval);
    return due.toISOString().slice(0, 10);
  }
}
