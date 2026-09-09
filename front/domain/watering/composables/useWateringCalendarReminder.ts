type WateringInfo = {
  wateringIntervalSummerDays?: number | null;
  wateringIntervalWinterDays?: number | null;
  nextDueOn?: string | null;
};

// SQL mirror of the back's summer window (watering/repository.ts
// nextDueExpression: `month between 4 and 9`) — keep both in sync.
const isSummerMonth = (month: number): boolean => month >= 4 && month <= 9;

// The interval verdure would currently apply, for a plant whose watering is
// tracked — undefined when untracked or when there is no due date to start
// the reminder from yet.
export const useWateringCalendarReminder = (
  plant: WateringInfo,
): { startDate: string; intervalDays: number } | undefined => {
  const summer = plant.wateringIntervalSummerDays ?? undefined;
  const winter = plant.wateringIntervalWinterDays ?? undefined;
  const startDate = plant.nextDueOn ?? undefined;
  const currentMonth = new Date().getMonth() + 1;
  const intervalDays = (isSummerMonth(currentMonth) ? summer : winter) ?? summer ?? winter;

  if (startDate === undefined || intervalDays === undefined) {
    return undefined;
  }
  return { startDate, intervalDays };
};
