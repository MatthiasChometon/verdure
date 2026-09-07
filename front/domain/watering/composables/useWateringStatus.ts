type WateringInfo = Pick<
  Plant,
  'wateringIntervalSummerDays' | 'wateringIntervalWinterDays' | 'lastWateredOn' | 'nextDueOn'
>;

// Local calendar day as an ISO date (YYYY-MM-DD).
export const todayIso = (): string => {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
};

// `today` is injectable so this stays pure and testable; returns null when the
// plant has no seasonal interval (untracked) — no badge to show.
export const useWateringStatus = (
  plant: WateringInfo,
  today: string = todayIso(),
): WateringStatus | null => {
  const wholeDaysBetween = (from: string, to: string): number =>
    Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

  const tracked =
    (plant.wateringIntervalSummerDays ?? null) !== null ||
    (plant.wateringIntervalWinterDays ?? null) !== null;
  if (!tracked) {
    return null;
  }

  const lastWateredOn = plant.lastWateredOn ?? null;
  const nextDueOn = plant.nextDueOn ?? null;
  if (lastWateredOn === null || nextDueOn === null) {
    return { level: 'never', labelKey: 'plant.watering.status.never', count: 0 };
  }

  if (lastWateredOn === today) {
    return {
      level: 'wateredToday',
      labelKey: 'plant.watering.status.wateredToday',
      count: 0,
    };
  }

  const overdueDays = wholeDaysBetween(nextDueOn, today);
  if (overdueDays > 0) {
    return {
      level: 'overdue',
      labelKey: 'plant.watering.status.overdue',
      count: overdueDays,
    };
  }
  if (overdueDays === 0) {
    return {
      level: 'dueToday',
      labelKey: 'plant.watering.status.dueToday',
      count: 0,
    };
  }
  return {
    level: 'upcoming',
    labelKey: 'plant.watering.status.upcoming',
    count: -overdueDays,
  };
};
