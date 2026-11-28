import { describe, expect, it } from 'vitest';
import { useParisDay } from './useParisDay';

const { isoOf, todayIso, daysBetween, addDays } = useParisDay();

describe('useParisDay', () => {
  it.each([
    // 23:30 UTC on 28 March is already 00:30 on the 29th in Paris (winter time, UTC+1).
    ['2026-03-28T23:30:00Z', '2026-03-29'],
    // Summer time (UTC+2): 22:30 UTC on 31 July is already 1 August in Paris.
    ['2026-07-31T22:30:00Z', '2026-08-01'],
    // 22:30 UTC in winter is still the same day in Paris (23:30).
    ['2026-01-10T22:30:00Z', '2026-01-10'],
    ['2026-12-31T23:30:00Z', '2027-01-01'],
  ])('reads %s as the Paris day %s whatever the machine zone', (instant, expected) => {
    expect(isoOf(new Date(instant))).toBe(expected);
    expect(todayIso(new Date(instant))).toBe(expected);
  });

  it('agrees with the Intl database every half hour around each daylight-saving change', () => {
    const oracle = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Paris',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const halfHour = 1_800_000;
    for (let year = 2024; year <= 2032; year += 1) {
      for (const month of [2, 9]) {
        const lastDay = new Date(Date.UTC(year, month + 1, 0));
        const change = Date.UTC(year, month, lastDay.getUTCDate() - lastDay.getUTCDay(), 1);
        for (let step = -96; step <= 96; step += 1) {
          const instant = new Date(change + step * halfHour);
          expect(isoOf(instant), instant.toISOString()).toBe(oracle.format(instant));
        }
      }
    }
  });

  it('counts whole days across a daylight-saving change', () => {
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
    expect(daysBetween('2026-10-26', '2026-10-24')).toBe(-2);
  });

  it('adds days to an ISO day, across months and years', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});
