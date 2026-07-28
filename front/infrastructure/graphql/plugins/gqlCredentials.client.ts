export default defineNuxtPlugin((): void => {
  useGqlCors({ mode: 'cors', credentials: 'include' });
});
