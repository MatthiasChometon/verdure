import { describe, expect, it } from 'vitest';
import { useNeedsCareSort } from './useNeedsCareSort';

const today = '2026-07-20';
const tracked = { wateringIntervalSummerDays: 7, wateringIntervalWinterDays: 14 };

const overdueBy3 = {
  id: 'overdue3',
  ...tracked,
  lastWateredOn: '2026-07-01',
  nextDueOn: '2026-07-17',
};
const overdueBy1 = {
  id: 'overdue1',
  ...tracked,
  lastWateredOn: '2026-07-12',
  nextDueOn: '2026-07-19',
};
const dueToday = { id: 'due', ...tracked, lastWateredOn: '2026-07-13', nextDueOn: '2026-07-20' };
const never = { id: 'never', ...tracked, lastWateredOn: null, nextDueOn: null };
const upcoming = {
  id: 'upcoming',
  ...tracked,
  lastWateredOn: '2026-07-18',
  nextDueOn: '2026-07-25',
};
const untracked = {
  id: 'untracked',
  wateringIntervalSummerDays: null,
  wateringIntervalWinterDays: null,
  lastWateredOn: null,
  nextDueOn: null,
};

const idsOf = (plants: { id: string }[]): string[] => plants.map((plant) => plant.id);

describe('useNeedsCareSort', () => {
  it('brings the plants that need care to the front, most overdue first', () => {
    const { sortByNeedsCare } = useNeedsCareSort();

    const ordered = sortByNeedsCare(
      [upcoming, never, overdueBy1, untracked, dueToday, overdueBy3],
      today,
    );

    expect(idsOf(ordered)).toEqual([
      'overdue3',
      'overdue1',
      'due',
      'never',
      'upcoming',
      'untracked',
    ]);
  });

  it('keeps the incoming order between plants that are equally urgent', () => {
    const { sortByNeedsCare } = useNeedsCareSort();
    const first = { ...upcoming, id: 'a' };
    const second = { ...upcoming, id: 'b' };

    const ordered = sortByNeedsCare([first, second], today);

    expect(idsOf(ordered)).toEqual(['a', 'b']);
  });
});
