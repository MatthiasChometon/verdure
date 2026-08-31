export default defineNuxtPlugin((nuxtApp): void => {
  const { keepFresh } = useWorkerStatusRefresh();
  nuxtApp.hook('app:mounted', keepFresh);
});
