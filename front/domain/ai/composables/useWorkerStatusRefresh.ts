// The "is a GPU worker connected?" value lives in the useAsyncData('ai-worker-online')
// cache (read through useAiWorker); this only keeps it fresh on the client. Returns
// keepFresh so the caller (a client plugin) decides when to start it.
export const useWorkerStatusRefresh = (): { keepFresh: () => void } => {
  const POLL_INTERVAL_MS = 8000;
  const SETTLE_MS = 600;

  let settle: ReturnType<typeof setTimeout> | undefined;

  const refresh = (): Promise<void> => refreshNuxtData('ai-worker-online');

  // A wifi<->4G switch fires offline+online back-to-back; collapse the burst into a
  // single refresh once the network settles, so the status doesn't flicker.
  const refreshOnceNetworkSettles = (): void => {
    clearTimeout(settle);
    settle = setTimeout((): void => void refresh(), SETTLE_MS);
  };

  const pollEvery = (intervalMs: number): void => {
    setInterval((): void => void refresh(), intervalMs);
  };

  const refreshWhenTabBecomesVisible = (): void => {
    document.addEventListener('visibilitychange', (): void => {
      if (document.visibilityState === 'visible') {
        refreshOnceNetworkSettles();
      }
    });
  };

  const refreshWhenNetworkChanges = (): void => {
    window.addEventListener('online', refreshOnceNetworkSettles);
    window.addEventListener('offline', refreshOnceNetworkSettles);
  };

  const keepFresh = (): void => {
    // First read now — the query is no longer immediate, and polling only fires
    // after the interval, so without this the status would be blank until then.
    void refresh();
    pollEvery(POLL_INTERVAL_MS);
    refreshWhenTabBecomesVisible();
    refreshWhenNetworkChanges();
  };

  return { keepFresh };
};
