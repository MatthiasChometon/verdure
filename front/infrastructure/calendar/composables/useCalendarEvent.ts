type UseCalendarEvent = {
  buildIcs: (reminder: RecurringReminder) => string;
  icsDataUrl: (reminder: RecurringReminder) => string;
  googleCalendarUrl: (reminder: RecurringReminder) => string;
};

// Generates a standalone iCalendar (.ics) file and a Google Calendar quick-add
// link for a single recurring, all-day reminder — no server round-trip, the
// event is built entirely from data the caller already has.
export const useCalendarEvent = (): UseCalendarEvent => {
  const escapeText = (text: string): string =>
    text
      .replaceAll('\\', '\\\\')
      .replaceAll(';', '\\;')
      .replaceAll(',', '\\,')
      .replaceAll('\n', '\\n');

  const toIcsDate = (isoDate: string): string => isoDate.replaceAll('-', '');

  const addDays = (isoDate: string, days: number): string => {
    const date = new Date(`${isoDate}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  };

  const nowIcsStamp = (): string =>
    `${new Date().toISOString().slice(0, 19).replaceAll(/[-:]/g, '')}Z`;

  const rrule = (reminder: RecurringReminder): string =>
    `RRULE:FREQ=DAILY;INTERVAL=${reminder.intervalDays}`;

  // DTEND is exclusive, so a one-day all-day event ends the day after it starts.
  const buildIcs = (reminder: RecurringReminder): string =>
    [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//verdure//reminders//FR',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${crypto.randomUUID()}@verdure`,
      `DTSTAMP:${nowIcsStamp()}`,
      `DTSTART;VALUE=DATE:${toIcsDate(reminder.startDate)}`,
      `DTEND;VALUE=DATE:${toIcsDate(addDays(reminder.startDate, 1))}`,
      rrule(reminder),
      `SUMMARY:${escapeText(reminder.title)}`,
      `DESCRIPTION:${escapeText(reminder.description)}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

  // A data: URI rather than a Blob object URL + forced `download`: iOS Safari
  // only opens its native "Add to Calendar" sheet for a plain link it can read
  // the text/calendar type from directly — a forced download saves a raw file
  // to Files instead. Desktop browsers still save it, since they can't render
  // the type either way.
  const icsDataUrl = (reminder: RecurringReminder): string =>
    `data:text/calendar;charset=utf-8,${encodeURIComponent(buildIcs(reminder))}`;

  const googleCalendarUrl = (reminder: RecurringReminder): string => {
    const start = toIcsDate(reminder.startDate);
    const end = toIcsDate(addDays(reminder.startDate, 1));
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: reminder.title,
      dates: `${start}/${end}`,
      details: reminder.description,
      recur: rrule(reminder),
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  return { buildIcs, icsDataUrl, googleCalendarUrl };
};
