const TIME_ZONE = 'Europe/Paris';
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
// Building an Intl.DateTimeFormat costs several milliseconds (about 50 ms of one page's render
// at the reference CPU slowdown, as every card and badge called this composable): one instance,
// made on first use, is shared by all of them.
let parisFormatter: Intl.DateTimeFormat | undefined;
const getParisFormatter = (): Intl.DateTimeFormat => {
  parisFormatter ??= new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return parisFormatter;
};

export const useParisDay = (): UseParisDay => {
  const isoOf = (instant: Date): string => {
    const parts = Object.fromEntries(
      getParisFormatter()
        .formatToParts(instant)
        .map((part) => [part.type, part.value]),
    );
    const { year, month, day } = parts;
    if (year === undefined || month === undefined || day === undefined) {
      throw new Error(`Cannot read the Paris day of ${instant.toISOString()}`);
    }
    return `${year}-${month}-${day}`;
  };

  const todayIso = (now: Date = new Date()): string => isoOf(now);

  const utcMidnight = (isoDate: string): number => Date.parse(`${isoDate}T00:00:00Z`);

  const daysBetween = (from: string, to: string): number =>
    Math.round((utcMidnight(to) - utcMidnight(from)) / MS_PER_DAY);

  const addDays = (isoDate: string, days: number): string =>
    new Date(utcMidnight(isoDate) + days * MS_PER_DAY).toISOString().slice(0, 10);

  return { isoOf, todayIso, daysBetween, addDays };
};
