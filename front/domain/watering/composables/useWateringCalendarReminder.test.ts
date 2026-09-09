import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWateringCalendarReminder } from './useWateringCalendarReminder';

const untracked = {
  wateringIntervalSummerDays: null,
  wateringIntervalWinterDays: null,
  nextDueOn: null,
};

describe('useWateringCalendarReminder', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns undefined for a plant whose watering is not tracked', () => {
    expect(useWateringCalendarReminder(untracked)).toBeUndefined();
  });

  it('returns undefined when there is no due date to start the reminder from', () => {
    const plant = { ...untracked, wateringIntervalSummerDays: 5, wateringIntervalWinterDays: 9 };

    expect(useWateringCalendarReminder(plant)).toBeUndefined();
  });

  describe('when the current month is in the summer window (April-September)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-07-15T12:00:00Z'));
    });

    it('picks the summer interval', () => {
      const plant = {
        wateringIntervalSummerDays: 5,
        wateringIntervalWinterDays: 9,
        nextDueOn: '2026-07-20',
      };

      expect(useWateringCalendarReminder(plant)).toEqual({
        startDate: '2026-07-20',
        intervalDays: 5,
      });
    });
  });

  describe('when the current month is in the winter window', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));
    });

    it('picks the winter interval', () => {
      const plant = {
        wateringIntervalSummerDays: 5,
        wateringIntervalWinterDays: 9,
        nextDueOn: '2026-01-20',
      };

      expect(useWateringCalendarReminder(plant)).toEqual({
        startDate: '2026-01-20',
        intervalDays: 9,
      });
    });

    it('falls back to whichever interval is set when only one is', () => {
      const plant = {
        wateringIntervalSummerDays: 5,
        wateringIntervalWinterDays: null,
        nextDueOn: '2026-01-20',
      };

      expect(useWateringCalendarReminder(plant)).toEqual({
        startDate: '2026-01-20',
        intervalDays: 5,
      });
    });
  });
});
