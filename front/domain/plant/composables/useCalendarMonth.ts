import type { ComputedRef, Ref } from 'vue';

export type CalendarDay = { iso: string; day: number; inMonth: boolean; isToday: boolean };

type UseCalendarMonth = {
  cursor: Ref<Date>;
  days: ComputedRef<CalendarDay[]>;
  weekdayLabels: ComputedRef<string[]>;
  monthLabel: ComputedRef<string>;
  rangeFrom: ComputedRef<string>;
  rangeTo: ComputedRef<string>;
  iso: (date: Date) => string;
  shiftMonth: (delta: number) => void;
};

// The month grid geometry: a Monday-first 6×7 cell grid for the cursor's month,
// its labels, and the iso range it spans — pure date arithmetic, no data.
export const useCalendarMonth = (): UseCalendarMonth => {
  const { locale } = useNuxtApp().$i18n;

  const iso = (date: Date): string => {
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  };

  const cursor = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const monthLabel = computed((): string =>
    new Intl.DateTimeFormat(locale.value, { month: 'long', year: 'numeric' }).format(cursor.value),
  );

  const weekdayLabels = computed((): string[] =>
    // 2024-01-01 is a Monday: build a Monday-first list of short weekday names.
    Array.from({ length: 7 }, (_, index) =>
      new Intl.DateTimeFormat(locale.value, { weekday: 'short' }).format(new Date(2024, 0, 1 + index)),
    ),
  );

  const days = computed((): CalendarDay[] => {
    const first = cursor.value;
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset);
    const today = iso(new Date());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
      const dayIso = iso(date);
      return {
        iso: dayIso,
        day: date.getDate(),
        inMonth: date.getMonth() === first.getMonth(),
        isToday: dayIso === today,
      };
    });
  });

  const rangeFrom = computed((): string => days.value[0]!.iso);
  const rangeTo = computed((): string => days.value[41]!.iso);

  const shiftMonth = (delta: number): void => {
    cursor.value = new Date(cursor.value.getFullYear(), cursor.value.getMonth() + delta, 1);
  };

  return { cursor, days, weekdayLabels, monthLabel, rangeFrom, rangeTo, iso, shiftMonth };
};
