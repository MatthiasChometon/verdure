import { describe, expect, it } from 'vitest';
import { clientIp } from './client-ip';

describe('clientIp', () => {
  it('uses the address the proxy appended to X-Forwarded-For', () => {
    const request = {
      ip: '127.0.0.1',
      headers: { 'x-forwarded-for': '203.0.113.7' },
    };

    expect(clientIp(request)).toBe('203.0.113.7');
  });

  it('ignores the addresses a client prepends to X-Forwarded-For', () => {
    const request = {
      ip: '127.0.0.1',
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8, 203.0.113.7' },
    };

    expect(clientIp(request)).toBe('203.0.113.7');
  });

  it('does not trust the Cloudflare header, which any client can set', () => {
    const request = {
      ip: '192.168.1.12',
      headers: { 'cf-connecting-ip': '203.0.113.7' },
    };

    expect(clientIp(request)).toBe('192.168.1.12');
  });

  it('falls back to the socket address when no proxy is in front', () => {
    const request = { ip: '192.168.1.12', headers: {} };

    expect(clientIp(request)).toBe('192.168.1.12');
  });
});
