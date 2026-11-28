import { describe, expect, it } from 'vitest';
import { useWateringCalendarReminder } from './useWateringCalendarReminder';

const untracked = {
  wateringIntervalSummerDays: null,
  wateringIntervalWinterDays: null,
  nextDueOn: null,
};

const bothSeasons = { wateringIntervalSummerDays: 5, wateringIntervalWinterDays: 9 };

describe('useWateringCalendarReminder', () => {
  it('returns undefined for a plant whose watering is not tracked', () => {
    expect(useWateringCalendarReminder(untracked, '2026-07-15')).toBeUndefined();
  });

  it('returns undefined when there is no due date to start the reminder from', () => {
    expect(
      useWateringCalendarReminder({ ...bothSeasons, nextDueOn: null }, '2026-07-15'),
    ).toBeUndefined();
  });

  it.each([
    ['April, first month of the summer window', '2026-04-01', 5],
    ['September, last month of the summer window', '2026-09-30', 5],
    ['March, just before the summer window', '2026-03-31', 9],
    ['October, just after the summer window', '2026-10-01', 9],
  ])('picks the interval of the season for %s', (_label, today, intervalDays) => {
    expect(useWateringCalendarReminder({ ...bothSeasons, nextDueOn: '2026-12-20' }, today)).toEqual(
      { startDate: '2026-12-20', intervalDays },
    );
  });

  it('falls back to whichever interval is set when the current season has none', () => {
    const plant = { ...bothSeasons, wateringIntervalWinterDays: null, nextDueOn: '2026-01-20' };

    expect(useWateringCalendarReminder(plant, '2026-01-15')).toEqual({
      startDate: '2026-01-20',
      intervalDays: 5,
    });
  });

  it('reads the season in Paris: the first instant of April is already summer there', () => {
    // 22:30 UTC on 31 March is 00:30 on 1 April in Paris.
    const today = useParisDay().todayIso(new Date('2026-03-31T22:30:00Z'));

    expect(
      useWateringCalendarReminder({ ...bothSeasons, nextDueOn: '2026-04-20' }, today)?.intervalDays,
    ).toBe(5);
  });
});
