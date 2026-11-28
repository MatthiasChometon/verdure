import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, type EffectScope } from 'vue';

const { refreshNuxtDataMock } = vi.hoisted(() => ({ refreshNuxtDataMock: vi.fn() }));
mockNuxtImport('refreshNuxtData', () => refreshNuxtDataMock);

beforeEach(() => {
  vi.useFakeTimers();
  refreshNuxtDataMock.mockReset().mockResolvedValue(undefined);
});
afterEach(() => {
  vi.useRealTimers();
});

// The app's own worker-status plugin also listens to these events for the whole test run
// (its polling timer is a real one, so fake timers never advance it): count what it adds
// by itself, and compare each case against that baseline.
const refreshesCausedByANetworkSwitch = (): number => {
  refreshNuxtDataMock.mockClear();
  window.dispatchEvent(new Event('offline'));
  window.dispatchEvent(new Event('online'));
  vi.advanceTimersByTime(1000);
  return refreshNuxtDataMock.mock.calls.length;
};

// useEventListener registers in a post-flush watcher: wait for it, or stopping the scope
// right away would leave the listener registered.
const mountRefresher = async (): Promise<{ scope: EffectScope; keepFresh: () => void }> => {
  const scope = effectScope();
  const refresher = scope.run(() => useWorkerStatusRefresh());
  await nextTick();
  return { scope, keepFresh: refresher?.keepFresh ?? ((): void => undefined) };
};

describe('useWorkerStatusRefresh', () => {
  it('reads once right away, then polls', async () => {
    const { scope, keepFresh } = await mountRefresher();
    keepFresh();
    expect(refreshNuxtDataMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(8000);

    expect(refreshNuxtDataMock).toHaveBeenCalledTimes(2);
    scope.stop();
  });

  it('neither polls nor reacts to the network until keepFresh is called', async () => {
    const baseline = refreshesCausedByANetworkSwitch();
    const { scope } = await mountRefresher();

    vi.advanceTimersByTime(30_000);

    expect(refreshesCausedByANetworkSwitch()).toBe(baseline);
    expect(refreshNuxtDataMock).toHaveBeenCalledTimes(baseline);
    scope.stop();
  });

  it('stops polling and listening when its scope stops', async () => {
    const baseline = refreshesCausedByANetworkSwitch();
    const { scope, keepFresh } = await mountRefresher();
    keepFresh();

    scope.stop();
    refreshNuxtDataMock.mockClear();
    vi.advanceTimersByTime(60_000);

    expect(refreshNuxtDataMock).not.toHaveBeenCalled();
    expect(refreshesCausedByANetworkSwitch()).toBe(baseline);
  });

  it('collapses an offline+online burst into one refresh', async () => {
    const baseline = refreshesCausedByANetworkSwitch();
    const { scope, keepFresh } = await mountRefresher();
    keepFresh();

    expect(refreshesCausedByANetworkSwitch()).toBe(baseline + 1);
    scope.stop();
  });
});
