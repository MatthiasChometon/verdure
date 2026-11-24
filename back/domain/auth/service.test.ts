import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './service';
import type { Session } from './type';
import { PasswordService } from './emailAndPassword/password.service';
import type { UserRecord } from '../user/type';

const recordOf = (overrides: Partial<UserRecord>): UserRecord => ({
  id: 'user-1',
  googleId: null,
  email: 'alice@test.dev',
  name: 'Alice',
  avatarUrl: null,
  passwordHash: null,
  emailVerifiedAt: new Date(),
  locale: 'fr',
  plantnetApiKey: null,
  createdAt: new Date(),
  ...overrides,
});

describe('AuthService.login', () => {
  const passwords = new PasswordService();
  const verify = vi.spyOn(passwords, 'verify');

  const loginWith = (record: UserRecord | undefined): Promise<Session> => {
    const service = new AuthService(
      {} as never,
      {} as never,
      { findByEmail: () => Promise.resolve(record) } as never,
      { signAsync: () => Promise.resolve('jwt') } as never,
      passwords,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { toModel: (found: UserRecord) => ({ id: found.id }) } as never,
    );
    return service.login('alice@test.dev', 'a-password');
  };

  beforeEach(() => {
    verify.mockClear();
  });

  it('derives a key for an unknown email, so it is as slow as a wrong password', async () => {
    await expect(loginWith(undefined)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(verify).toHaveBeenCalledTimes(1);
  });

  it('derives a key for a Google-only account too', async () => {
    await expect(
      loginWith(recordOf({ passwordHash: null })),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(verify).toHaveBeenCalledTimes(1);
  });

  it('answers a wrong password and an unknown email with the same error', async () => {
    const hash = await passwords.hash('another-password');
    verify.mockClear();

    const wrong = await loginWith(recordOf({ passwordHash: hash })).catch(
      (error: unknown) => error,
    );
    const unknown = await loginWith(undefined).catch((error: unknown) => error);

    expect(wrong).toBeInstanceOf(UnauthorizedException);
    expect((wrong as Error).message).toBe((unknown as Error).message);
  });

  it('refuses an unverified account only once the password is right', async () => {
    const hash = await passwords.hash('a-password');

    await expect(
      loginWith(recordOf({ passwordHash: hash, emailVerifiedAt: null })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('opens a session for a verified account with the right password', async () => {
    const hash = await passwords.hash('a-password');

    await expect(
      loginWith(recordOf({ passwordHash: hash })),
    ).resolves.toMatchObject({ token: 'jwt' });
  });
});
