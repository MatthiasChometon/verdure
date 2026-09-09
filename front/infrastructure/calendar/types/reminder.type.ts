// A single recurring reminder, generic enough for any "every N days" task —
// no plant/care vocabulary here, that translation happens at the call site.
export type RecurringReminder = {
  title: string;
  description: string;
  startDate: string;
  intervalDays: number;
};
