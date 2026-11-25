type WateringInfo = {
  wateringIntervalSummerDays?: number | null;
  wateringIntervalWinterDays?: number | null;
  nextDueOn?: string | null;
};

// The interval verdure would currently apply, for a plant whose watering is
// tracked — undefined when untracked or when there is no due date to start
// the reminder from yet. `today` is injectable (Paris day) to stay pure.
export const useWateringCalendarReminder = (
  plant: WateringInfo,
  today: string = useParisDay().todayIso(),
): { startDate: string; intervalDays: number } | undefined => {
  const { intervalOn } = useWateringSeason();

  const summer = plant.wateringIntervalSummerDays ?? undefined;
  const winter = plant.wateringIntervalWinterDays ?? undefined;
  const startDate = plant.nextDueOn ?? undefined;
  const intervalDays = intervalOn(today, summer, winter) ?? summer ?? winter;

  if (startDate === undefined || intervalDays === undefined) {
    return undefined;
  }
  return { startDate, intervalDays };
};
