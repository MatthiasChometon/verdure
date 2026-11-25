import type { ComputedRef } from 'vue';

export type CalendarDay = { iso: string; day: number; inMonth: boolean; isToday: boolean };

type UseCalendarMonth = {
  days: ComputedRef<CalendarDay[]>;
  weekdayLabels: ComputedRef<string[]>;
  monthLabel: ComputedRef<string>;
  rangeFrom: ComputedRef<string>;
  rangeTo: ComputedRef<string>;
  shiftMonth: (delta: number) => void;
};

const GRID_CELLS = 42;

// The month grid geometry: a Monday-first 6×7 cell grid for the shown month, its labels,
// and the ISO range it spans. Pure calendar-day arithmetic (no machine zone involved);
// only "today" and the first shown month come from the Paris day. `now` is injectable.
export const useCalendarMonth = (now: () => Date = () => new Date()): UseCalendarMonth => {
  const { locale } = useNuxtApp().$i18n;
  const { todayIso, addDays } = useParisDay();

  // First day of the shown month, as an ISO day.
  const monthStart = ref(`${todayIso(now()).slice(0, 7)}-01`);

  // Formats a calendar day without letting the machine zone shift it.
  const format = (isoDate: string, options: Intl.DateTimeFormatOptions): string =>
    new Intl.DateTimeFormat(locale.value, { ...options, timeZone: 'UTC' }).format(
      new Date(`${isoDate}T00:00:00Z`),
    );

  const monthLabel = computed((): string =>
    format(monthStart.value, { month: 'long', year: 'numeric' }),
  );

  // 2024-01-01 is a Monday: build a Monday-first list of short weekday names.
  const weekdayLabels = computed((): string[] =>
    Array.from({ length: 7 }, (_, index) =>
      format(addDays('2024-01-01', index), { weekday: 'short' }),
    ),
  );

  const gridStart = computed((): string => {
    const weekday = new Date(`${monthStart.value}T00:00:00Z`).getUTCDay();
    return addDays(monthStart.value, -((weekday + 6) % 7));
  });

  const days = computed((): CalendarDay[] => {
    const today = todayIso(now());
    return Array.from({ length: GRID_CELLS }, (_, index): CalendarDay => {
      const iso = addDays(gridStart.value, index);
      return {
        iso,
        day: Number(iso.slice(8, 10)),
        inMonth: iso.slice(0, 7) === monthStart.value.slice(0, 7),
        isToday: iso === today,
      };
    });
  });

  const rangeFrom = computed((): string => gridStart.value);
  const rangeTo = computed((): string => addDays(gridStart.value, GRID_CELLS - 1));

  const shiftMonth = (delta: number): void => {
    const year = Number(monthStart.value.slice(0, 4));
    const month = Number(monthStart.value.slice(5, 7));
    monthStart.value = new Date(Date.UTC(year, month - 1 + delta, 1)).toISOString().slice(0, 10);
  };

  return { days, weekdayLabels, monthLabel, rangeFrom, rangeTo, shiftMonth };
};
