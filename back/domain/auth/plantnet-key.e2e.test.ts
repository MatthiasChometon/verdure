import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PlantTestHarness } from '../plant/harness';
import { user } from '../user/schema';

const SET_KEY = 'mutation ($key: String) { setPlantnetApiKey(key: $key) }';

describe('Pl@ntNet key argument (e2e)', () => {
  const harness = new PlantTestHarness();
  beforeAll(() => harness.init());
  afterAll(() => harness.close());

  const storedKey = async (): Promise<string | null | undefined> => {
    const [alice] = await harness.database
      .select({ key: user.plantnetApiKey })
      .from(user)
      .where(eq(user.email, 'alice@test.dev'));
    return alice?.key;
  };

  it('stores a trimmed key', async () => {
    await harness.graphql(SET_KEY, harness.aliceToken, { key: ' 2b10Key ' });

    expect(await storedKey()).toBe('2b10Key');
  });

  it.each([null, '', '   '])('clears the key when given %j', async (key) => {
    await harness.graphql(SET_KEY, harness.aliceToken, { key: '2b10Key' });

    await harness.graphql(SET_KEY, harness.aliceToken, { key });

    expect(await storedKey()).toBeNull();
  });

  it.each(['two words', 'new\nline', 'a'.repeat(201)])(
    'refuses a malformed key with BAD_USER_INPUT and keeps the stored one',
    async (key) => {
      await harness.graphql(SET_KEY, harness.aliceToken, { key: '2b10Key' });

      const body = await harness.request<unknown>(
        SET_KEY,
        { key },
        harness.aliceToken,
      );

      expect(body.errors).toMatchObject([
        { extensions: { code: 'BAD_USER_INPUT' } },
      ]);
      expect(await storedKey()).toBe('2b10Key');
    },
  );
});
