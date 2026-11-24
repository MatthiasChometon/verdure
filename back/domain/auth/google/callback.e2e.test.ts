import { ServiceUnavailableException } from '@nestjs/common';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  AuthTestHarness,
  type InjectResponse,
} from '../emailAndPassword/harness';

const STATE_COOKIE = 'oauth_state';
const SESSION_COOKIE = 'auth_token';

describe('Google sign-in callback (e2e)', () => {
  const harness = new AuthTestHarness();
  beforeAll(() => harness.init());
  afterAll(() => harness.close());
  beforeEach(() => harness.reset());

  const callback = (
    query: string,
    stateCookie?: string,
  ): Promise<InjectResponse> =>
    harness.get(
      `/auth/google/callback?${query}`,
      stateCookie === undefined
        ? {}
        : { cookie: `${STATE_COOKIE}=${stateCookie}` },
    );

  const cookieValue = (
    response: InjectResponse,
    name: string,
  ): string | undefined =>
    response.cookies.find((cookie) => cookie.name === name)?.value;

  it('starts by redirecting to Google with a state it also stores in a cookie', async () => {
    const response = await harness.get('/auth/google');

    expect(response.statusCode).toBe(302);
    const state = cookieValue(response, STATE_COOKIE);
    expect(state).toBeTruthy();
    expect(response.headers.location).toContain(`state=${state}`);
  });

  it('opens a session and clears the state cookie when the state matches', async () => {
    const response = await callback('code=abc&state=good', 'good');

    expect(response.statusCode).toBe(302);
    expect(cookieValue(response, SESSION_COOKIE)).toBeTruthy();
    expect(cookieValue(response, STATE_COOKIE)).toBe('');
  });

  it('ignores the extra parameters Google adds to the callback', async () => {
    const response = await callback(
      'code=abc&state=good&scope=email+profile&authuser=0&prompt=none',
      'good',
    );

    expect(response.statusCode).toBe(302);
  });

  it('refuses a state that differs from the stored one, and clears it', async () => {
    const response = await callback('code=abc&state=forged', 'good');

    expect(response.statusCode).toBe(401);
    expect(cookieValue(response, SESSION_COOKIE)).toBeUndefined();
    expect(cookieValue(response, STATE_COOKIE)).toBe('');
  });

  it('refuses a callback with no state cookie', async () => {
    const response = await callback('code=abc&state=good');

    expect(response.statusCode).toBe(401);
  });

  it('answers 401, not 400, when the person refused and Google sent neither code nor state', async () => {
    const response = await callback('error=access_denied', 'good');

    expect(response.statusCode).toBe(401);
  });

  it('refuses a repeated state parameter as a malformed request', async () => {
    const response = await callback('code=abc&state=good&state=good', 'good');

    expect(response.statusCode).toBe(400);
  });

  it('answers 503 and clears the state when Google cannot be reached', async () => {
    harness.google.outcome = new ServiceUnavailableException('Google is down');

    const response = await callback('code=abc&state=good', 'good');

    expect(response.statusCode).toBe(503);
    expect(cookieValue(response, STATE_COOKIE)).toBe('');
  });
});
