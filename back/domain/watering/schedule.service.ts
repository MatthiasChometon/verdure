import { Injectable } from '@nestjs/common';
import { WateringSeason } from './type';

// Stretches a plant's own interval into a finer month-level gradient on top of the
// coarse summer/winter rhythm: dormancy slows most, shoulder months a little.
const DEEP_DORMANCY_FACTOR = 1.5;
const SHOULDER_FACTOR = 1.2;
const GROWING_FACTOR = 1;

@Injectable()
export class WateringScheduleService {
  // Growing season (April–September) needs more frequent watering than the
  // dormant season (October–March). Dates are pure (no time) → read UTC month.
  season(date: Date): WateringSeason {
    const month = this.monthOf(date);
    return month >= 4 && month <= 9 ? 'summer' : 'winter';
  }

  // Deep winter dormancy (December–February): the plant rests and drinks least.
  isWinterRest(date: Date): boolean {
    const month = this.monthOf(date);
    return month === 12 || month <= 2;
  }

  // A plant only "rests" in a rhythm it actually tracks for winter — an untracked
  // plant has no interval to slow, so it never shows the winter-rest indicator.
  winterRest(date: Date, winterDays: number | null): boolean {
    return winterDays !== null && this.isWinterRest(date);
  }

  // How much the base interval is stretched for the season of a given date.
  seasonalFactor(date: Date): number {
    if (this.isWinterRest(date)) {
      return DEEP_DORMANCY_FACTOR;
    }
    return this.season(date) === 'summer' ? GROWING_FACTOR : SHOULDER_FACTOR;
  }

  // Kept in sync with the SQL mirror in list/repository.ts's nextDueExpression.
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
    due.setUTCDate(due.getUTCDate() + this.seasonalDays(interval, last));
    return due.toISOString().slice(0, 10);
  }

  private seasonalDays(interval: number, date: Date): number {
    return Math.round(interval * this.seasonalFactor(date));
  }

  private monthOf(date: Date): number {
    return date.getUTCMonth() + 1;
  }
}
