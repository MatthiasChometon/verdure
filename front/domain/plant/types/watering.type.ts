export type WateringLevel =
  | 'overdue'
  | 'dueToday'
  | 'upcoming'
  | 'wateredToday'
  | 'never';

export type WateringStatus = {
  level: WateringLevel;
  // i18n key + the day count to interpolate (overdue / upcoming only).
  labelKey: string;
  count: number;
};
