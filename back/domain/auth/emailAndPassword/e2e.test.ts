import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AuthTestHarness } from './harness';

describe('Auth REST (e2e)', () => {
  const harness = new AuthTestHarness();
  beforeAll(() => harness.init());
  afterAll(() => harness.close());
  beforeEach(() => harness.reset());

  it('registers an unverified account, sets no cookie, and emails a link', async () => {
    const response = await harness.register(
      'alice@auth.test',
      'sup3r-secret',
      'Alice',
    );

    expect(response.statusCode).toBeLessThan(300);
    expect(response.json<{ status: string }>().status).toBe(
      'verification_sent',
    );
    expect(harness.sessionToken(response)).toBeUndefined();
    expect(harness.mail.lastTokenFor('alice@auth.test')).not.toBe('');
  });

  it('refuses login until the email is verified', async () => {
    await harness.register('bob@auth.test', 'sup3r-secret', 'Bob');

    const response = await harness.login('bob@auth.test', 'sup3r-secret');
    expect(response.statusCode).toBe(403);
    expect(harness.sessionToken(response)).toBeUndefined();
  });

  it('verifies the email, opens a session, and then allows login', async () => {
    await harness.register('carol@auth.test', 'sup3r-secret', 'Carol');

    const verify = await harness.post('/auth/verify-email', {
      token: harness.mail.lastTokenFor('carol@auth.test'),
    });
    expect(verify.statusCode).toBeLessThan(300);
    expect(verify.json<{ email: string }>().email).toBe('carol@auth.test');
    expect(harness.sessionToken(verify)).toBeDefined();

    const loggedIn = await harness.login('carol@auth.test', 'sup3r-secret');
    expect(loggedIn.statusCode).toBeLessThan(300);
    expect(harness.sessionToken(loggedIn)).toBeDefined();
  });

  it('rejects an invalid verification token', async () => {
    const response = await harness.post('/auth/verify-email', {
      token: 'deadbeef',
    });
    expect(response.statusCode).toBe(401);
  });

  it('rejects registering an email that already exists', async () => {
    await harness.register('dave@auth.test', 'sup3r-secret', 'Dave');
    const response = await harness.register(
      'dave@auth.test',
      'another-secret',
      'Dave2',
    );
    expect(response.statusCode).toBe(409);
  });

  it('resets the password via the emailed link and logs in with the new one', async () => {
    await harness.registerVerified('erin@auth.test', 'old-password', 'Erin');
    harness.mail.messages = [];

    const forgot = await harness.post('/auth/forgot-password', {
      email: 'erin@auth.test',
    });
    expect(forgot.statusCode).toBeLessThan(300);

    const reset = await harness.post('/auth/reset-password', {
      token: harness.mail.lastTokenFor('erin@auth.test'),
      password: 'brand-new-password',
    });
    expect(reset.statusCode).toBeLessThan(300);
    expect(harness.sessionToken(reset)).toBeDefined();

    const oldFails = await harness.login('erin@auth.test', 'old-password');
    expect(oldFails.statusCode).toBe(401);

    const newWorks = await harness.login(
      'erin@auth.test',
      'brand-new-password',
    );
    expect(newWorks.statusCode).toBeLessThan(300);
  });

  it('stays silent when asked to reset an unknown email', async () => {
    const response = await harness.post('/auth/forgot-password', {
      email: 'nobody@auth.test',
    });
    expect(response.statusCode).toBeLessThan(300);
    expect(harness.mail.messages).toHaveLength(0);
  });

  it('rejects an invalid reset token', async () => {
    const response = await harness.post('/auth/reset-password', {
      token: 'deadbeef',
      password: 'brand-new-password',
    });
    expect(response.statusCode).toBe(401);
  });
});

describe('Auth e-mails after the response (e2e)', () => {
  const harness = new AuthTestHarness();
  beforeAll(() => harness.init());
  afterAll(() => harness.close());
  beforeEach(() => harness.reset());

  const settlesWithin = (
    promise: Promise<unknown>,
    ms: number,
  ): Promise<boolean> =>
    Promise.race([
      promise.then(() => true),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), ms)),
    ]);

  it('keeps the account and answers success when the mail server fails on sign-up', async () => {
    harness.mail.failure = new Error('SMTP is down');

    const response = await harness.register(
      'ned@auth.test',
      'sup3r-secret',
      'Ned',
    );

    expect(response.statusCode).toBeLessThan(300);
    const login = await harness.login('ned@auth.test', 'sup3r-secret');
    expect(login.statusCode).toBe(403);
  });

  it.each([
    ['resending the verification', '/auth/resend-verification'],
    ['asking for a password reset', '/auth/forgot-password'],
  ])('answers success when the mail server fails on %s', async (_case, url) => {
    await harness.register('mia@auth.test', 'sup3r-secret', 'Mia');
    harness.mail.failure = new Error('SMTP is down');

    const response = await harness.post(url, { email: 'mia@auth.test' });

    expect(response.statusCode).toBeLessThan(300);
  });

  // Holds every mail until the returned function is called.
  const holdMail = (): (() => void) => {
    let release: () => void = () => undefined;
    harness.mail.gate = new Promise<void>((resolve) => (release = resolve));
    return release;
  };

  it('does not wait for the mail server when signing up', async () => {
    const release = holdMail();

    const answered = harness.postWithoutSettling('/auth/register', {
      email: 'zed@auth.test',
      password: 'sup3r-secret',
      name: 'Zed',
    });

    expect(await settlesWithin(answered, 1000)).toBe(true);
    expect(harness.mail.messages).toHaveLength(0);
    release();
  });

  it('does not wait for the mail server when asking for a password reset', async () => {
    await harness.registerVerified('zoe@auth.test', 'sup3r-secret', 'Zoe');
    const release = holdMail();

    const answered = harness.postWithoutSettling('/auth/forgot-password', {
      email: 'zoe@auth.test',
    });

    expect(await settlesWithin(answered, 1000)).toBe(true);
    release();
  });
});
