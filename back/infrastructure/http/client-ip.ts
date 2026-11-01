import type { ClientRequest } from './type';

// In production the API runs under Passenger behind the o2switch web server, so
// the socket address is the proxy's and is the same for every visitor. The proxy
// appends the address it received the request from to X-Forwarded-For. A client
// can only prepend fake entries, so the LAST entry is the one we can trust.
// Without the header (local, Docker) the socket address is already the client's.
const FORWARDED_FOR_HEADER = 'x-forwarded-for';

const lastForwardedAddress = (
  header: string | string[] | undefined,
): string | undefined => {
  const value = Array.isArray(header) ? header.join(',') : header;
  const last = value?.split(',').at(-1)?.trim();
  return last === '' ? undefined : last;
};

export const clientIp = (request: ClientRequest): string =>
  lastForwardedAddress(request.headers[FORWARDED_FOR_HEADER]) ?? request.ip;
