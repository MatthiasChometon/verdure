type WateringInfo = Pick<
  Plant,
  'wateringIntervalSummerDays' | 'wateringIntervalWinterDays' | 'lastWateredOn' | 'nextDueOn'
>;

// `today` is injectable so this stays pure and testable; undefined when the plant
// has no seasonal interval (untracked) — no badge to show.
export const useWateringStatus = (
  plant: WateringInfo,
  today: string = useParisDay().todayIso(),
): WateringStatus | undefined => {
  const { daysBetween } = useParisDay();

  const summerDays = plant.wateringIntervalSummerDays ?? undefined;
  const winterDays = plant.wateringIntervalWinterDays ?? undefined;
  if (summerDays === undefined && winterDays === undefined) {
    return undefined;
  }

  const lastWateredOn = plant.lastWateredOn ?? undefined;
  const nextDueOn = plant.nextDueOn ?? undefined;
  if (lastWateredOn === undefined || nextDueOn === undefined) {
    return { level: 'never', count: 0 };
  }
  if (lastWateredOn === today) {
    return { level: 'wateredToday', count: 0 };
  }

  const overdueDays = daysBetween(nextDueOn, today);
  if (overdueDays > 0) {
    return { level: 'overdue', count: overdueDays };
  }
  if (overdueDays === 0) {
    return { level: 'dueToday', count: 0 };
  }
  return { level: 'upcoming', count: -overdueDays };
};
