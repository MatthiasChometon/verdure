type Waterable = Pick<
  Plant,
  'wateringIntervalSummerDays' | 'wateringIntervalWinterDays' | 'lastWateredOn' | 'nextDueOn'
>;

type UseNeedsCareSort = {
  sortByNeedsCare: <T extends Waterable>(plants: T[], today?: string) => T[];
};

// Client-side triage on the already-loaded page: pull the plants that need
// attention now to the front — most overdue first, then due today, then
// never-watered — while every other plant keeps its incoming order. It reuses
// the same watering status each card shows, so the order matches the badges.
export const useNeedsCareSort = (): UseNeedsCareSort => {
  const rankByLevel: Record<Exclude<WateringLevel, 'overdue'>, number> = {
    dueToday: 1,
    never: 2,
    upcoming: 3,
    wateredToday: 4,
  };
  const untrackedRank = 5;

  const careRank = (plant: Waterable, today?: string): number => {
    const status = useWateringStatus(plant, today);
    if (status === null) {
      return untrackedRank;
    }
    // Overdue always sorts first (negative), most overdue leading.
    if (status.level === 'overdue') {
      return -status.count;
    }
    return rankByLevel[status.level];
  };

  const sortByNeedsCare = <T extends Waterable>(plants: T[], today?: string): T[] =>
    plants
      .map((plant, index) => ({ plant, index, rank: careRank(plant, today) }))
      .sort((a, b) => a.rank - b.rank || a.index - b.index)
      .map((entry) => entry.plant);

  return { sortByNeedsCare };
};
