export type FeedEvent = {
  // Stable per plant+task (not a fresh UUID per fetch): subscribed calendars
  // re-fetch this feed periodically and match VEVENTs by UID, so a stable id
  // lets the due date update in place instead of piling up duplicates.
  uid: string;
  title: string;
  description: string;
  dueOn: string;
};

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

// DTEND is exclusive, so a one-day all-day event ends the day after it starts.
const vevent = (event: FeedEvent): string[] => [
  'BEGIN:VEVENT',
  `UID:${event.uid}@verdure`,
  `DTSTAMP:${nowIcsStamp()}`,
  `DTSTART;VALUE=DATE:${toIcsDate(event.dueOn)}`,
  `DTEND;VALUE=DATE:${toIcsDate(addDays(event.dueOn, 1))}`,
  `SUMMARY:${escapeText(event.title)}`,
  `DESCRIPTION:${escapeText(event.description)}`,
  'END:VEVENT',
];

// Recomputed from scratch on every fetch (no recurrence rule): watering
// intervals shift with the season, so there is no single RRULE that fits —
// the subscribing calendar app's own periodic re-fetch is what keeps the
// visible due date current.
export const buildIcsFeed = (events: FeedEvent[]): string =>
  [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//verdure//calendar-feed//FR',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:verdure',
    'REFRESH-INTERVAL;VALUE=DURATION:P1D',
    'X-PUBLISHED-TTL:P1D',
    ...events.flatMap(vevent),
    'END:VCALENDAR',
  ].join('\r\n');
