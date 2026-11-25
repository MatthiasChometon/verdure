export type CareLevel = 'never' | 'overdue' | 'dueToday' | 'upcoming';

export type CareStatus = {
  level: CareLevel;
  count: number;
};

// `today` is injectable so this stays pure and testable; a routine never done has
// no cycle to measure, so it reads as "never" rather than overdue.
export const useCareStatus = (
  schedule: Pick<CareSchedule, 'lastDoneOn' | 'nextDueOn'>,
  today: string = useParisDay().todayIso(),
): CareStatus => {
  const lastDoneOn = schedule.lastDoneOn ?? undefined;
  const nextDueOn = schedule.nextDueOn ?? undefined;
  if (lastDoneOn === undefined || nextDueOn === undefined) {
    return { level: 'never', count: 0 };
  }

  const overdueDays = useParisDay().daysBetween(nextDueOn, today);
  if (overdueDays > 0) {
    return { level: 'overdue', count: overdueDays };
  }
  if (overdueDays === 0) {
    return { level: 'dueToday', count: 0 };
  }
  return { level: 'upcoming', count: -overdueDays };
};
