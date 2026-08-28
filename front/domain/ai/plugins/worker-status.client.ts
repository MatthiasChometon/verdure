// Keep the shared "is a GPU worker connected?" query fresh app-wide without a
// per-component poll: one interval, plus immediate re-checks when the tab regains
// focus or the network flips, so the badge and the simple<->advanced switch track
// reality without a page refresh. The value itself lives in the
// useAsyncData('ai-worker-online') cache (read through useAiWorker); this plugin
// only triggers its refresh, on the client.
const POLL_INTERVAL_MS = 8000;
// Collapse a burst (a wifi<->4G switch fires offline+online back-to-back) into a
// single check once the network settles, so the status doesn't flicker.
const SETTLE_MS = 600;

export default defineNuxtPlugin((nuxtApp) => {
  const refresh = (): Promise<void> => refreshNuxtData('ai-worker-online');

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
    setInterval((): void => {
      void refresh();
    }, POLL_INTERVAL_MS);

    document.addEventListener('visibilitychange', (): void => {
      if (document.visibilityState === 'visible') {
        refreshSoon();
      }
    });
    window.addEventListener('online', refreshSoon);
    window.addEventListener('offline', refreshSoon);
  });
});
