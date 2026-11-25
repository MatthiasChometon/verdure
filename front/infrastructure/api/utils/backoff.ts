// The pure parts of retrying, shared by the API client and every polling loop.
// The back keeps its own twin in `back/infrastructure/http/retry.ts`: it is
// another deployable with no shared package, and a package for ~20 lines would
// cost more than the copy.

// What a server answers when it is overloaded or asks to come back later, and
// nothing else: a 500 is a bug that will answer the same again, a 4xx a refusal.
export const TRANSIENT_STATUS_CODES: readonly number[] = [408, 429, 502, 503, 504];
const TRANSIENT_STATUSES: ReadonlySet<number> = new Set(TRANSIENT_STATUS_CODES);

export const isTransientStatus = (status: number): boolean => TRANSIENT_STATUSES.has(status);

// `Retry-After` is either a number of seconds or an HTTP date.
export const retryAfterMs = (
  header: string | null,
  now: number = Date.now(),
): number | undefined => {
  if (header === null || header.trim() === '') return undefined;

  if (/^\d+$/.test(header.trim())) return Number(header.trim()) * 1000;

  const date = Date.parse(header);
  return Number.isNaN(date) ? undefined : Math.max(0, date - now);
};

// A server that says when to come back is obeyed, within a ceiling so a bogus
// header cannot park the tab; otherwise a short jittered wait. `retryAfter` is
// the raw `Retry-After` header of the failed answer, if any.
const MAX_RETRY_AFTER_MS = 10_000;

export const apiRetryDelay = (
  retryAfter: string | null,
  random: () => number = Math.random,
  now: number = Date.now(),
): number => {
  const requested = retryAfterMs(retryAfter, now);
  return requested === undefined
    ? backoffDelay(0, { baseDelayMs: 600, maxDelayMs: 2000, random })
    : Math.min(requested, MAX_RETRY_AFTER_MS);
};

export type BackoffOptions = {
  baseDelayMs: number;
  maxDelayMs: number;
  random: () => number;
};

// Full jitter: anywhere between nothing and the exponential ceiling, so callers
// that failed together do not come back together.
export const backoffDelay = (
  attempt: number,
  { baseDelayMs, maxDelayMs, random }: BackoffOptions,
): number => Math.floor(random() * Math.min(maxDelayMs, baseDelayMs * 2 ** attempt));

// How long to wait before a polling loop asks again: the interval, give or take
// a fifth, so several browsers started together drift apart instead of asking
// the API in the same second. Full jitter would halve the polling rate.
export const jitteredInterval = (intervalMs: number, random: () => number = Math.random): number =>
  Math.round(intervalMs * (0.8 + random() * 0.4));
