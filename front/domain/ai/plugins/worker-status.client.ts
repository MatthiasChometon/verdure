const POLL_INTERVAL_MS = 8000;
const SETTLE_MS = 600;

// The "is a GPU worker connected?" value lives in the useAsyncData('ai-worker-online')
// cache (read through useAiWorker); this client plugin only keeps it fresh.
export default defineNuxtPlugin((nuxtApp): void => {
  nuxtApp.hook('app:mounted', keepWorkerStatusFresh);
});

const keepWorkerStatusFresh = (): void => {
  pollEvery(POLL_INTERVAL_MS, refreshWorkerStatus);
  refreshWhenTabBecomesVisible();
  refreshWhenNetworkChanges();
};

const refreshWorkerStatus = (): Promise<void> => refreshNuxtData('ai-worker-online');

const pollEvery = (intervalMs: number, run: () => Promise<void>): void => {
  setInterval((): void => void run(), intervalMs);
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

// A wifi<->4G switch fires offline+online back-to-back; collapse the burst into a
// single refresh once the network settles, so the status doesn't flicker.
let settle: ReturnType<typeof setTimeout> | undefined;
const refreshOnceNetworkSettles = (): void => {
  clearTimeout(settle);
  settle = setTimeout((): void => void refreshWorkerStatus(), SETTLE_MS);
};
