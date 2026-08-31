// The 00. prefix runs this before the api plugin, so the host is rewritten before
// any request is configured.
export default defineNuxtPlugin((): void => {
  const { build } = useDynamicHost();
  build();
});
