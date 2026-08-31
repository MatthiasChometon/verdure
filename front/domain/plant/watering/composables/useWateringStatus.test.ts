import { describe, expect, it } from 'vitest';
import { useWateringStatus } from './useWateringStatus';

const tracked = { wateringIntervalSummerDays: 7, wateringIntervalWinterDays: 14 };

describe('useWateringStatus', () => {
  it('returns null when the plant has no interval (untracked)', () => {
    expect(
      useWateringStatus(
        {
          wateringIntervalSummerDays: null,
          wateringIntervalWinterDays: null,
          lastWateredOn: null,
          nextDueOn: null,
        },
        '2026-07-20',
      ),
    ).toBeNull();
  });

  it('flags a tracked plant that was never watered', () => {
    expect(
      useWateringStatus({ ...tracked, lastWateredOn: null, nextDueOn: null }, '2026-07-20')?.level,
    ).toBe('never');
  });

  it('flags a plant watered today', () => {
    expect(
      useWateringStatus(
        { ...tracked, lastWateredOn: '2026-07-20', nextDueOn: '2026-07-27' },
        '2026-07-20',
      )?.level,
    ).toBe('wateredToday');
  });

  it('flags a plant due today', () => {
    expect(
      useWateringStatus(
        { ...tracked, lastWateredOn: '2026-07-01', nextDueOn: '2026-07-20' },
        '2026-07-20',
      )?.level,
    ).toBe('dueToday');
  });

  it('counts overdue days', () => {
    expect(
      useWateringStatus(
        { ...tracked, lastWateredOn: '2026-07-01', nextDueOn: '2026-07-08' },
        '2026-07-12',
      ),
    ).toMatchObject({ level: 'overdue', count: 4 });
  });

  it('counts days until the next watering', () => {
    expect(
      useWateringStatus(
        { ...tracked, lastWateredOn: '2026-07-18', nextDueOn: '2026-07-25' },
        '2026-07-20',
      ),
    ).toMatchObject({ level: 'upcoming', count: 5 });
  });
});
