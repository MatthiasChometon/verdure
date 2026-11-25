import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePolling } from './usePolling';

afterEach(() => {
  vi.useRealTimers();
});

describe('usePolling', () => {
  it('returns the first settled value without waiting when the first check settles', async () => {
    const check = vi.fn().mockResolvedValue('done');

    const result = await usePolling().pollUntilSettled(check, { intervalMs: 800, maxPolls: 5 });

    expect(result).toBe('done');
    expect(check).toHaveBeenCalledTimes(1);
  });

  it('keeps polling at the given interval until a check settles', async () => {
    vi.useFakeTimers();
    const check = vi
      .fn<() => Promise<string | undefined>>()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce('done');

    const pending = usePolling().pollUntilSettled(check, { intervalMs: 800, maxPolls: 5 });
    await vi.advanceTimersByTimeAsync(1600);

    await expect(pending).resolves.toBe('done');
    expect(check).toHaveBeenCalledTimes(3);
  });

  it('gives up with undefined after maxPolls attempts', async () => {
    vi.useFakeTimers();
    const check = vi.fn().mockResolvedValue(undefined);

    const pending = usePolling().pollUntilSettled(check, { intervalMs: 800, maxPolls: 3 });
    await vi.advanceTimersByTimeAsync(2400);

    await expect(pending).resolves.toBeUndefined();
    expect(check).toHaveBeenCalledTimes(3);
  });
});
