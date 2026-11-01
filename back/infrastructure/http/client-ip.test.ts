import { describe, expect, it } from 'vitest';
import { clientIp } from './client-ip';

describe('clientIp', () => {
  it('uses the visitor address Cloudflare forwards', () => {
    const request = {
      ip: '10.0.0.1',
      headers: { 'cf-connecting-ip': '203.0.113.7' },
    };

    expect(clientIp(request)).toBe('203.0.113.7');
  });

  it('falls back to the socket address when no proxy is in front', () => {
    const request = { ip: '192.168.1.12', headers: {} };

    expect(clientIp(request)).toBe('192.168.1.12');
  });
});
