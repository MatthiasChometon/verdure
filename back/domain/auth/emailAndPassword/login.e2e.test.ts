import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest';
import { user } from '../../user/schema';
import { AuthTestHarness } from './harness';
import { PasswordService } from './password.service';

describe('Login timing (e2e)', () => {
  const harness = new AuthTestHarness();
  const verifySpy = (): MockInstance<PasswordService['verify']> =>
    vi.spyOn(harness.resolve(PasswordService), 'verify');

  beforeAll(() => harness.init());
  afterAll(() => harness.close());
  beforeEach(async () => {
    await harness.reset();
    vi.restoreAllMocks();
  });

  it('derives a key for an unknown email, so it is as slow as a wrong password', async () => {
    const verify = verifySpy();

    const response = await harness.login('nobody@auth.test', 'a-password');

    expect(response.statusCode).toBe(401);
    expect(verify).toHaveBeenCalledTimes(1);
  });

  it('derives a key for a Google-only account too', async () => {
    await harness.database.insert(user).values({
      email: 'gina@auth.test',
      name: 'Gina',
      googleId: 'google-gina',
      emailVerifiedAt: new Date(),
    });
    const verify = verifySpy();

    const response = await harness.login('gina@auth.test', 'a-password');

    expect(response.statusCode).toBe(401);
    expect(verify).toHaveBeenCalledTimes(1);
  });

  it('answers a wrong password and an unknown email with the same error', async () => {
    await harness.registerVerified(
      'wendy@auth.test',
      'right-password',
      'Wendy',
    );

    const wrong = await harness.login('wendy@auth.test', 'wrong-password');
    const unknown = await harness.login('nobody@auth.test', 'wrong-password');

    expect(wrong.statusCode).toBe(401);
    expect(wrong.json<{ message: string }>().message).toBe(
      unknown.json<{ message: string }>().message,
    );
  });

  it('refuses an unverified account only once the password is right', async () => {
    await harness.register('vic@auth.test', 'right-password', 'Vic');

    const wrong = await harness.login('vic@auth.test', 'wrong-password');
    const right = await harness.login('vic@auth.test', 'right-password');

    expect(wrong.statusCode).toBe(401);
    expect(right.statusCode).toBe(403);
  });

  it('opens a session for a verified account with the right password', async () => {
    await harness.registerVerified('uma@auth.test', 'right-password', 'Uma');

    const response = await harness.login('uma@auth.test', 'right-password');

    expect(response.statusCode).toBeLessThan(300);
    expect(harness.sessionToken(response)).toBeDefined();
  });
});
