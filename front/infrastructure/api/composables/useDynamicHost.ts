// Port of the back when it is served beside the front on a local/LAN host.
const LOCAL_BACK_PORT = 3000;

// Baked in at build for a public deploy; local/LAN access rewrites it so the
// app follows the page's own host and the auth cookie matches the origin.
export const useDynamicHost = (): { build: () => void } => {
  const isPrivateIpv4 = (hostname: string): boolean =>
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);

  const getIsLocalHostAccess = (): boolean => {
    const { hostname } = window.location;
    return hostname === 'localhost' || isPrivateIpv4(hostname);
  };

  const resolveBackOrigin = (): string => {
    const { origin, protocol, hostname } = window.location;
    const sharesPageOrigin = useRuntimeConfig().public.apiSameOrigin;
    return sharesPageOrigin ? origin : `${protocol}//${hostname}:${LOCAL_BACK_PORT}`;
  };

  const setRestApiBaseUrl = (back: string): void => {
    useRuntimeConfig().public.apiBase = back;
  };

  const setGraphqlApiBaseUrl = (back: string): void => useGqlHost(`${back}/graphql`);

  const build = (): void => {
    if (!getIsLocalHostAccess()) {
      return;
    }
    const backOrigin = resolveBackOrigin();
    setRestApiBaseUrl(backOrigin);
    setGraphqlApiBaseUrl(backOrigin);
  };

  return { build };
};
