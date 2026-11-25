import { beforeAll, describe, expect, it } from 'vitest';
import { useCalendarMonth } from './useCalendarMonth';

// 22:30 UTC on 31 March 2026 is 00:30 on 1 April in Paris: the shown month and "today"
// must follow Paris, not the machine zone.
const justAfterParisMidnight = (): Date => new Date('2026-03-31T22:30:00Z');

describe('useCalendarMonth', () => {
  beforeAll(async (): Promise<void> => {
    await useNuxtApp().$i18n.setLocale('fr');
  });

  it('opens on the Paris month and marks the Paris day as today', () => {
    const { monthLabel, days } = useCalendarMonth(justAfterParisMidnight);

    expect(monthLabel.value).toBe('avril 2026');
    expect(days.value.filter((cell) => cell.isToday).map((cell) => cell.iso)).toEqual([
      '2026-04-01',
    ]);
  });

  it('lays out a Monday-first grid of 42 cells covering the month', () => {
    const { days, rangeFrom, rangeTo } = useCalendarMonth(justAfterParisMidnight);

    // 1 April 2026 is a Wednesday: the grid starts on Monday 30 March.
    expect(days.value).toHaveLength(42);
    expect(rangeFrom.value).toBe('2026-03-30');
    expect(rangeTo.value).toBe('2026-05-10');
    expect(days.value.filter((cell) => cell.inMonth)).toHaveLength(30);
    expect(days.value[0]).toMatchObject({ iso: '2026-03-30', day: 30, inMonth: false });
  });

  it('lists the weekdays Monday first', () => {
    const { weekdayLabels } = useCalendarMonth(justAfterParisMidnight);

    expect(weekdayLabels.value[0]).toMatch(/^lun/);
    expect(weekdayLabels.value[6]).toMatch(/^dim/);
  });

  it('shifts across a year boundary', () => {
    const { monthLabel, shiftMonth } = useCalendarMonth(() => new Date('2026-12-15T12:00:00Z'));

    shiftMonth(1);
    expect(monthLabel.value).toBe('janvier 2027');

    shiftMonth(-2);
    expect(monthLabel.value).toBe('novembre 2026');
  });
});
