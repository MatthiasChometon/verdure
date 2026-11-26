const MS_PER_DAY = 86_400_000;

type UseParisDay = {
  // The calendar day (YYYY-MM-DD) an instant falls on in Paris, whatever the machine zone.
  isoOf: (instant: Date) => string;
  todayIso: (now?: Date) => string;
  // Signed whole days from one ISO day to another (positive when `to` is later).
  daysBetween: (from: string, to: string) => number;
  // Adds days to an ISO day; pure calendar arithmetic, no zone involved.
  addDays: (isoDate: string, days: number) => string;
};

// Every watering and care date is a Paris calendar day (the back computes them in the same
// zone): the machine zone must never move a plant to the day before or after.
// No Intl.DateTimeFormat here: building one with a time zone loads the zone data and cost about
// 55 ms of one page's render (226 ms at the reference CPU slowdown). Paris follows the European
// rule, UTC+1 in winter and UTC+2 from the last Sunday of March to the last Sunday of October,
// both changes at 01:00 UTC, which plain arithmetic gives.
const MS_PER_HOUR = 3_600_000;
const MARCH = 2;
const OCTOBER = 9;

const lastSundayAtOneUtc = (year: number, month: number): number => {
  const lastDay = new Date(Date.UTC(year, month + 1, 0));
  return Date.UTC(year, month, lastDay.getUTCDate() - lastDay.getUTCDay(), 1);
};

const parisOffsetHours = (instantMs: number): number => {
  const year = new Date(instantMs).getUTCFullYear();
  const summer =
    instantMs >= lastSundayAtOneUtc(year, MARCH) && instantMs < lastSundayAtOneUtc(year, OCTOBER);
  return summer ? 2 : 1;
};

export const useParisDay = (): UseParisDay => {
  const isoOf = (instant: Date): string => {
    const instantMs = instant.getTime();
    if (Number.isNaN(instantMs)) {
      throw new Error('Cannot read the Paris day of an invalid date');
    }
    return new Date(instantMs + parisOffsetHours(instantMs) * MS_PER_HOUR)
      .toISOString()
      .slice(0, 10);
  };

  const todayIso = (now: Date = new Date()): string => isoOf(now);

  const utcMidnight = (isoDate: string): number => Date.parse(`${isoDate}T00:00:00Z`);

  const daysBetween = (from: string, to: string): number =>
    Math.round((utcMidnight(to) - utcMidnight(from)) / MS_PER_DAY);

  const addDays = (isoDate: string, days: number): string =>
    new Date(utcMidnight(isoDate) + days * MS_PER_DAY).toISOString().slice(0, 10);

  return { isoOf, todayIso, daysBetween, addDays };
};
