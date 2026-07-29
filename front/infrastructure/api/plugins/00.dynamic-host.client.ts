// Reach the back on the SAME host the page was opened from — so the app works
// identically on http://localhost:3666 and on http://<LAN-IP>:3666 (phone),
// and the auth cookie always matches the origin (Google login, sessions).
// The back is always on port 3000; runs before the api plugin.
export default defineNuxtPlugin((): void => {
  const config = useRuntimeConfig();
  // Behind the prod reverse proxy the back shares the page's origin (Caddy
  // routes /graphql, /auth, … to it); in dev it sits on port 3000 of the host.
  const back = config.public.apiSameOrigin
    ? window.location.origin
    : `${window.location.protocol}//${window.location.hostname}:3000`;
  config.public.apiBase = back;
  useGqlHost(`${back}/graphql`);
});
