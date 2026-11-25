export type CareLevel = 'never' | 'overdue' | 'dueToday' | 'upcoming';

export type CareStatus = {
  level: CareLevel;
  count: number;
};

// `today` is injectable so this stays pure and testable; a routine never done has
// no cycle to measure, so it reads as "never" rather than overdue.
export const useCareStatus = (
  schedule: Pick<CareSchedule, 'lastDoneOn' | 'nextDueOn'>,
  today?: string,
): CareStatus => {
  const { todayIso, daysBetween } = useParisDay();
  const day = today ?? todayIso();
  const lastDoneOn = schedule.lastDoneOn ?? undefined;
  const nextDueOn = schedule.nextDueOn ?? undefined;
  if (lastDoneOn === undefined || nextDueOn === undefined) {
    return { level: 'never', count: 0 };
  }

  const overdueDays = daysBetween(nextDueOn, day);
  if (overdueDays > 0) {
    return { level: 'overdue', count: overdueDays };
  }
  if (overdueDays === 0) {
    return { level: 'dueToday', count: 0 };
  }
  return { level: 'upcoming', count: -overdueDays };
};
