import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AuthTestHarness, type InjectResponse } from './harness';

const ALLOWED_ATTEMPTS = 10;

describe('Auth rate limiting (e2e)', () => {
  const harness = new AuthTestHarness();
  beforeAll(() => harness.init());
  afterAll(() => harness.close());

  const loginFrom = (ip: string): Promise<InjectResponse> =>
    harness.post(
      '/auth/login',
      { email: 'guess@auth.test', password: 'wrong-password' },
      { 'cf-connecting-ip': ip },
    );

  const exhaustAttemptsFrom = async (ip: string): Promise<void> => {
    for (let attempt = 0; attempt < ALLOWED_ATTEMPTS; attempt += 1) {
      await loginFrom(ip);
    }
  };

  it('refuses login attempts past the limit from the same client', async () => {
    await exhaustAttemptsFrom('203.0.113.1');

    const response = await loginFrom('203.0.113.1');

    expect(response.statusCode).toBe(429);
  });

  it('counts each client behind the proxy separately', async () => {
    await exhaustAttemptsFrom('203.0.113.2');

    const response = await loginFrom('203.0.113.3');

    expect(response.statusCode).toBe(401);
  });
});
