export type WateringLevel = 'overdue' | 'dueToday' | 'upcoming' | 'wateredToday' | 'never';

// `count` is the day count to interpolate (overdue / upcoming only, 0 otherwise).
export type WateringStatus = {
  level: WateringLevel;
  count: number;
};
