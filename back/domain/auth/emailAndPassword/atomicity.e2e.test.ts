import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type DatabaseExecutor } from '../../../infrastructure/database/token';
import { UserRepository } from '../../user/repository';
import { user } from '../../user/schema';
import { AuthTestHarness } from './harness';
import { authToken } from './schema';
import { AuthTokenRepository } from './token-repository';

const PASSWORD = 'sup3r-secret';
const LOCK_WAIT_MS = 300;

type HeldTransaction = {
  started: Promise<void>;
  release: () => void;
  done: Promise<unknown>;
};

// Runs `work` in a transaction that stays uncommitted until `release()`, so a
// test can stage a second request behind its row locks instead of hoping that
// parallel calls happen to overlap.
const holdTransaction = (
  harness: AuthTestHarness,
  work: (tx: DatabaseExecutor) => Promise<unknown>,
): HeldTransaction => {
  let release: () => void = () => undefined;
  let started: () => void = () => undefined;
  const hold = new Promise<void>((resolve) => (release = resolve));
  const begun = new Promise<void>((resolve) => (started = resolve));
  const done = harness.database.transaction(async (tx) => {
    await work(tx);
    started();
    await hold;
  });
  return { started: begun, release, done };
};

const settlesWithin = (
  promise: Promise<unknown>,
  ms: number,
): Promise<boolean> =>
  Promise.race([
    promise.then(() => true),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), ms)),
  ]);

describe('Auth token and account atomicity (e2e)', () => {
  const harness = new AuthTestHarness();
  beforeAll(() => harness.init());
  afterAll(() => harness.close());
  beforeEach(() => harness.reset());

  const verificationTokenFor = async (email: string): Promise<string> => {
    await harness.register(email, PASSWORD, 'Someone');
    return harness.mail.lastTokenFor(email);
  };

  describe('token spend', () => {
    it('is undone with its transaction, so a failed write does not burn the link', async () => {
      const tokens = harness.resolve(AuthTokenRepository);
      const raw = await verificationTokenFor('burnt@auth.test');

      await harness.database
        .transaction(async (tx) => {
          const owner = await tokens.spend(raw, 'email_verification', tx);
          expect(owner).toBeDefined();
          throw new Error('the authorised write failed');
        })
        .catch(() => undefined);

      const response = await harness.post('/auth/verify-email', { token: raw });
      expect(response.statusCode).toBeLessThan(300);
    });

    it('is won by exactly one of two concurrent redemptions', async () => {
      const tokens = harness.resolve(AuthTokenRepository);
      const raw = await verificationTokenFor('race@auth.test');

      // The first redemption has deleted the row but not committed: the second
      // has to wait for it rather than read the row as still there.
      const first = holdTransaction(harness, (tx) =>
        tokens.spend(raw, 'email_verification', tx),
      );
      await first.started;
      const second = tokens.spend(raw, 'email_verification');
      expect(await settlesWithin(second, LOCK_WAIT_MS)).toBe(false);

      first.release();
      await first.done;

      expect(await second).toBeUndefined();
    });

    it('refuses an expired token and removes it', async () => {
      const tokens = harness.resolve(AuthTokenRepository);
      const raw = await verificationTokenFor('late@auth.test');
      await harness.database
        .update(authToken)
        .set({ expiresAt: new Date(Date.now() - 1000) });

      expect(await tokens.spend(raw, 'email_verification')).toBeUndefined();
      expect(await harness.database.select().from(authToken)).toHaveLength(0);
    });

    it('is bound to its type: a verification link cannot reset a password', async () => {
      const raw = await verificationTokenFor('typed@auth.test');

      const response = await harness.post('/auth/reset-password', {
        token: raw,
        password: 'brand-new-password',
      });

      expect(response.statusCode).toBe(401);
    });

    it('cannot be redeemed twice over HTTP', async () => {
      const raw = await verificationTokenFor('twice@auth.test');

      const first = await harness.post('/auth/verify-email', { token: raw });
      const second = await harness.post('/auth/verify-email', { token: raw });

      expect(first.statusCode).toBeLessThan(300);
      expect(second.statusCode).toBe(401);
    });
  });

  describe('sign-up', () => {
    it('answers 409 to the loser when two sign-ups for one address race', async () => {
      // The winner has inserted the address but not committed: the loser is
      // decided by the unique key, not by a check that cannot see the row.
      const winner = holdTransaction(harness, (tx) =>
        tx.insert(user).values({
          email: 'raced@auth.test',
          name: 'Winner',
          passwordHash: 'x:y',
        }),
      );
      await winner.started;
      const loser = harness.register('raced@auth.test', PASSWORD, 'Loser');
      expect(await settlesWithin(loser, LOCK_WAIT_MS)).toBe(false);

      winner.release();
      await winner.done;

      expect((await loser).statusCode).toBe(409);
      expect(harness.mail.messages).toHaveLength(0);
    });
  });

  describe('Google sign-in', () => {
    const profile = {
      googleId: 'google-race',
      email: 'google@auth.test',
      name: 'Gina',
      avatarUrl: null,
    };

    it('creates the account on a first sign-in, already verified', async () => {
      const users = harness.resolve(UserRepository);

      const created = await users.upsertByGoogleId(profile);

      expect(created.email).toBe('google@auth.test');
      const [row] = await harness.database
        .select()
        .from(user)
        .where(eq(user.id, created.id));
      expect(row?.emailVerifiedAt).not.toBeNull();
    });

    it('lets two first sign-ins for one address land on one account', async () => {
      const users = harness.resolve(UserRepository);
      // Another request has inserted the address but not committed.
      const other = holdTransaction(harness, (tx) =>
        tx.insert(user).values({ email: profile.email, name: 'Other' }),
      );
      await other.started;
      const signIn = users.upsertByGoogleId(profile);
      expect(await settlesWithin(signIn, LOCK_WAIT_MS)).toBe(false);

      other.release();
      await other.done;

      const linked = await signIn;
      expect(linked.name).toBe('Gina');
      expect(await harness.database.select().from(user)).toHaveLength(1);
    });

    it('drops the password someone set on an address nobody verified', async () => {
      const users = harness.resolve(UserRepository);
      await harness.register(profile.email, 'squatter-password', 'Squatter');

      await users.upsertByGoogleId(profile);

      const login = await harness.login(profile.email, 'squatter-password');
      expect(login.statusCode).toBe(401);
    });

    it('keeps the password of an address that was already verified', async () => {
      const users = harness.resolve(UserRepository);
      await harness.registerVerified(profile.email, PASSWORD, 'Gina');

      await users.upsertByGoogleId(profile);

      const login = await harness.login(profile.email, PASSWORD);
      expect(login.statusCode).toBeLessThan(300);
    });
  });
});
