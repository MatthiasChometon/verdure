// The service worker precaches the whole build (over 1 MB): registered right at load it competes
// with the page for the network and the main thread, so it waits until the page has settled.
const REGISTRATION_DELAY_MS = 8000;

export default defineNuxtPlugin((nuxtApp): void => {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
    return;
  }
  nuxtApp.hook('app:mounted', (): void => {
    setTimeout((): void => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((error: unknown): void => {
        console.error('[service-worker]', error);
      });
    }, REGISTRATION_DELAY_MS);
  });
});
