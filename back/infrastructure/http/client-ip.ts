import type { ClientRequest } from './type';

// Behind Cloudflare every request reaches the API from the proxy, so the socket
// IP is the same for everyone; Cloudflare sets this header to the visitor's
// address. Without it (local, Docker) the socket IP is already the client's.
const PROXIED_CLIENT_HEADER = 'cf-connecting-ip';

export const clientIp = (request: ClientRequest): string => {
  const proxied = request.headers[PROXIED_CLIENT_HEADER];
  return typeof proxied === 'string' && proxied !== '' ? proxied : request.ip;
};
