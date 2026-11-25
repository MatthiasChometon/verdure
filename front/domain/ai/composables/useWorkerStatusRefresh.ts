// Keeps the useAsyncData('ai-worker-online') cache (read via useAiWorker) fresh client-side.
// Timer and listeners are created here, in the caller's scope, so they stop with it;
// the returned keepFresh starts them once the caller (a client plugin) decides to.
export const useWorkerStatusRefresh = (): { keepFresh: () => void } => {
  const POLL_INTERVAL_MS = 8000;
  const SETTLE_MS = 600;

  const refresh = (): Promise<void> => refreshNuxtData('ai-worker-online');

  // A wifi<->4G switch fires offline+online back-to-back; collapse the burst into a
  // single refresh once the network settles, so the status doesn't flicker.
  const { start: refreshOnceNetworkSettles, stop: cancelPendingRefresh } = useTimeoutFn(
    (): void => void refresh(),
    SETTLE_MS,
    { immediate: false },
  );

  const { resume: startPolling } = useIntervalFn((): void => void refresh(), POLL_INTERVAL_MS, {
    immediate: false,
  });

  let started = false;
  const refreshOnceNetworkSettlesWhenStarted = (): void => {
    if (started) {
      refreshOnceNetworkSettles();
    }
  };

  useEventListener(document, 'visibilitychange', (): void => {
    if (document.visibilityState === 'visible') {
      refreshOnceNetworkSettlesWhenStarted();
    }
  });
  useEventListener(window, ['online', 'offline'], refreshOnceNetworkSettlesWhenStarted);
  tryOnScopeDispose(cancelPendingRefresh);

  const keepFresh = (): void => {
    started = true;
    // First read now — the query is no longer immediate, and polling only fires
    // after the interval, so without this the status would be blank until then.
    void refresh();
    startPolling();
  };

  return { keepFresh };
};
