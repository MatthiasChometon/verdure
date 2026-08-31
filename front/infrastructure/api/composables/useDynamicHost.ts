// On a public deploy the API host is baked in at build; only local/LAN access
// rewrites it, so the app follows the page's own host (localhost or <LAN-IP>) and
// the auth cookie always matches the origin.
export const useDynamicHost = (): void => {
  if (isLocalHostAccess()) {
    pointApiAt(resolveBackOrigin());
  }
};

const isLocalHostAccess = (): boolean => {
  const { hostname } = window.location;
  return hostname === 'localhost' || isPrivateIpv4(hostname);
};

const isPrivateIpv4 = (hostname: string): boolean =>
  /^127\./.test(hostname) ||
  /^10\./.test(hostname) ||
  /^192\.168\./.test(hostname) ||
  /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);

const resolveBackOrigin = (): string => {
  const { origin, protocol, hostname } = window.location;
  return sharesPageOrigin() ? origin : `${protocol}//${hostname}:3000`;
};

const sharesPageOrigin = (): boolean => useRuntimeConfig().public.apiSameOrigin;

const pointApiAt = (back: string): void => {
  pointRestApiAt(back);
  pointGraphqlAt(back);
};

const pointRestApiAt = (back: string): void => {
  useRuntimeConfig().public.apiBase = back;
};

const pointGraphqlAt = (back: string): void => useGqlHost(`${back}/graphql`);
