// Self-hosted local access: reach the back on the SAME host the page was opened
// from — so the app works identically on http://localhost:3666 and on
// http://<LAN-IP>:3666 (phone), the auth cookie always matching the origin.
// On a PUBLIC deployment (e.g. Netlify) the API base and GraphQL host are baked
// in at build (NUXT_PUBLIC_API_BASE / GQL_CLIENT_HOST point at o2switch), so we
// leave them untouched. Runs before the api plugin.
export default defineNuxtPlugin((): void => {
  const { hostname, protocol, origin } = window.location;
  const isLocalHost =
    hostname === 'localhost' ||
    /^127\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
  if (!isLocalHost) {
    return;
  }

  const config = useRuntimeConfig();
  // Behind the prod reverse proxy the back shares the page's origin; in local
  // dev it sits on port 3000 of the same host.
  const back = config.public.apiSameOrigin
    ? origin
    : `${protocol}//${hostname}:3000`;
  config.public.apiBase = back;
  useGqlHost(`${back}/graphql`);
});
