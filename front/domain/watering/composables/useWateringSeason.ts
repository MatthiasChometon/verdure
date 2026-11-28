type UseWateringSeason = {
  // The interval (in days) applying to a due date: summer from April to September.
  intervalOn: (
    isoDate: string,
    summerDays: number | undefined,
    winterDays: number | undefined,
  ) => number | undefined;
};

// Mirror of the back's summer window (`WateringScheduleService` / the repository's
// `nextDueExpression`: month between 4 and 9) — keep both in sync.
export const useWateringSeason = (): UseWateringSeason => {
  const isSummerMonth = (month: number): boolean => month >= 4 && month <= 9;

  const intervalOn = (
    isoDate: string,
    summerDays: number | undefined,
    winterDays: number | undefined,
  ): number | undefined => (isSummerMonth(Number(isoDate.slice(5, 7))) ? summerDays : winterDays);

  return { intervalOn };
};
