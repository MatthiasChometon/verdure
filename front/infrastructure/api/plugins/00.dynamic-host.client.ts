// Reach the back on the SAME host the page was opened from — so the app works
// identically on http://localhost:3666 and on http://<LAN-IP>:3666 (phone),
// and the auth cookie always matches the origin (Google login, sessions).
// The back is always on port 3000; runs before the api plugin.
export default defineNuxtPlugin((): void => {
  const back = `${window.location.protocol}//${window.location.hostname}:3000`;
  useRuntimeConfig().public.apiBase = back;
  useGqlHost(`${back}/graphql`);
});
