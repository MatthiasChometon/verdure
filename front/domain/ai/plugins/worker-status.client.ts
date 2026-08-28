// One shared, real-time "is a GPU worker connected?" signal for the whole app.
// A single poll (instead of one per component), plus immediate re-checks when the
// tab regains focus or the network changes, so the badge and the simple<->advanced
// switch reflect reality without a page refresh. The value lives in useState so
// every useAiWorker() reads the same source; the poll and listeners are wired up
// once here, on the client only.
const POLL_INTERVAL_MS = 8000;
// Collapse a burst (a wifi<->4G switch fires offline+online back-to-back) into a
// single check once the network settles, so the status doesn't flicker.
const SETTLE_MS = 600;

export default defineNuxtPlugin((nuxtApp) => {
  const online = useState<boolean>('aiWorkerOnline', () => false);

  let inFlight = false;
  const refresh = async (): Promise<void> => {
    if (inFlight) {
      return;
    }
    inFlight = true;
    try {
      online.value = (await GqlAiWorkerOnline()).aiWorkerOnline;
    } catch {
      // Unreachable back (the device itself is offline, etc.) = no usable worker.
      online.value = false;
    } finally {
      inFlight = false;
    }
  };

  let settle: ReturnType<typeof setTimeout> | undefined;
  const refreshSoon = (): void => {
    if (settle) {
      clearTimeout(settle);
    }
    settle = setTimeout((): void => {
      void refresh();
    }, SETTLE_MS);
  };

  nuxtApp.hook('app:mounted', (): void => {
    void refresh();
    setInterval((): void => {
      void refresh();
    }, POLL_INTERVAL_MS);

    // Real-time triggers beyond the interval: returning to the tab, and the
    // network flipping (going online/offline).
    document.addEventListener('visibilitychange', (): void => {
      if (document.visibilityState === 'visible') {
        refreshSoon();
      }
    });
    window.addEventListener('online', refreshSoon);
    window.addEventListener('offline', refreshSoon);
  });

  return { provide: { refreshAiWorker: refresh } };
});
