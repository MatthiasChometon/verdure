type Waterable = Pick<
  Plant,
  'wateringIntervalSummerDays' | 'wateringIntervalWinterDays' | 'lastWateredOn' | 'nextDueOn'
>;

type UseNeedsCareSort = {
  sortByNeedsCare: <T extends Waterable>(plants: T[], today?: string) => T[];
};

// Reuses the same watering status each card shows, so the sort order matches the
// badges: overdue → due today → never-watered first, everyone else keeps their order.
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
