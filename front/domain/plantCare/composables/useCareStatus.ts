export type CareLevel = 'never' | 'overdue' | 'dueToday' | 'upcoming';

export type CareStatus = {
  level: CareLevel;
  labelKey: string;
  count: number;
};

// `today` is injectable so this stays pure and testable; a routine never done has
// no cycle to measure, so it reads as "never" rather than overdue.
export const useCareStatus = (
  schedule: Pick<CareSchedule, 'lastDoneOn' | 'nextDueOn'>,
  today: string = todayIso(),
): CareStatus => {
  const wholeDaysBetween = (from: string, to: string): number =>
    Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

  const lastDoneOn = schedule.lastDoneOn ?? null;
  const nextDueOn = schedule.nextDueOn ?? null;
  if (lastDoneOn === null || nextDueOn === null) {
    return { level: 'never', labelKey: 'plant.care.status.never', count: 0 };
  }

  const overdueDays = wholeDaysBetween(nextDueOn, today);
  if (overdueDays > 0) {
    return { level: 'overdue', labelKey: 'plant.care.status.overdue', count: overdueDays };
  }
  if (overdueDays === 0) {
    return { level: 'dueToday', labelKey: 'plant.care.status.dueToday', count: 0 };
  }
  return { level: 'upcoming', labelKey: 'plant.care.status.upcoming', count: -overdueDays };
};
