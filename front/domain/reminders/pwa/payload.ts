// A watering reminder as the service worker shows it. The push body comes from the
// network, so every field is validated here before it reaches the notification API.
export type ReminderPayload = { title: string; body: string; url: string };

const FALLBACK: ReminderPayload = { title: 'verdure', body: '', url: '/' };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

// Only a path inside this app is ever opened: an absolute URL to another origin, a
// protocol-relative `//host` or a `javascript:` URL collapse to the home page.
export const safeAppPath = (raw: unknown, origin: string): string => {
  if (typeof raw !== 'string') {
    return FALLBACK.url;
  }
  try {
    const target = new URL(raw, origin);
    const path = `${target.pathname}${target.search}${target.hash}`;
    // `//host` (kept by URL normalisation, e.g. from `/.//host`) and a backslash would be
    // resolved as another origin when the path is opened later.
    const isInApp = target.origin === origin && /^\/(?![/\\])/.test(path) && !path.includes('\\');
    return isInApp ? path : FALLBACK.url;
  } catch {
    return FALLBACK.url;
  }
};

export const parseReminderPayload = (raw: unknown, origin: string): ReminderPayload => {
  if (!isRecord(raw)) {
    return FALLBACK;
  }
  const { title, body, url } = raw;
  return {
    title: typeof title === 'string' && title !== '' ? title : FALLBACK.title,
    body: typeof body === 'string' ? body : FALLBACK.body,
    url: safeAppPath(url, origin),
  };
};

// A non-JSON push (unexpected): show its text rather than nothing.
export const textReminderPayload = (text: string): ReminderPayload => ({ ...FALLBACK, body: text });
