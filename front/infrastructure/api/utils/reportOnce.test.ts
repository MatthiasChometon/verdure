import { createFetch } from 'ofetch';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiInterceptors } from './apiInterceptors';

// The real chain: ofetch calls the interceptor, throws its own error, and the
// code that caught it reports it too, as the components do.
const apiAnswering = (answer: () => Promise<Response>): typeof $fetch => {
  const { reportError } = useErrorReporting();

  return createFetch({ fetch: answer as unknown as typeof fetch }).create({
    baseURL: 'http://api.test',
    retryDelay: 0,
    retryStatusCodes: [...TRANSIENT_STATUS_CODES],
    ...createApiInterceptors({ expireSession: vi.fn(), report: reportError }),
  }) as typeof $fetch;
};

// The app booting around the test may log on its own; only the lines about the
// calls made here count.
const sink = vi.spyOn(console, 'error').mockImplementation(() => undefined);

const sentFor = (path: string): unknown[] =>
  sink.mock.calls.filter(([context]) => {
    const text = String(context);
    return text.endsWith(`${path}]`) || text === `[${path.slice(1)}:load]`;
  });

beforeEach(() => {
  sink.mockClear();
});

describe('a failure met by the interceptor and by the code that caught it', () => {
  it('reaches monitoring once for a 500', async () => {
    const api = apiAnswering(() => Promise.resolve(new Response('{}', { status: 500 })));
    const { reportError } = useErrorReporting();

    await api('/items').catch((error: unknown): void => reportError('items:load', error));

    expect(sentFor('/items')).toHaveLength(1);
  });

  it('does not retry a 500, but retries a 503 once', async () => {
    const answer = vi.fn(() => Promise.resolve(new Response('{}', { status: 500 })));
    await apiAnswering(answer)('/items').catch((): void => undefined);
    expect(answer).toHaveBeenCalledTimes(1);

    const busy = vi.fn(() => Promise.resolve(new Response('{}', { status: 503 })));
    await apiAnswering(busy)('/items').catch((): void => undefined);
    expect(busy).toHaveBeenCalledTimes(2);
  });

  it('reaches monitoring once for a network failure', async () => {
    const api = apiAnswering(() => Promise.reject(new TypeError('Failed to fetch')));
    const { reportError } = useErrorReporting();

    await api('/items').catch((error: unknown): void => reportError('items:load', error));

    expect(sentFor('/items')).toHaveLength(1);
  });

  it('still reports a different failure that follows', async () => {
    const api = apiAnswering(() => Promise.resolve(new Response('{}', { status: 502 })));
    const { reportError } = useErrorReporting();

    await api('/a').catch((error: unknown): void => reportError('a', error));
    await api('/b').catch((error: unknown): void => reportError('b', error));

    expect(sentFor('/a')).toHaveLength(1);
    expect(sentFor('/b')).toHaveLength(1);
  });
});
