import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type DatabaseExecutor } from '../../infrastructure/database/token';
import { PlantTestHarness } from '../plant/harness';
import { user } from '../user/schema';
import { calendarFeedToken } from './schema';

const TOKEN = 'query { calendarFeedToken }';
const REGENERATE = 'mutation { regenerateCalendarFeedToken }';
const SET_CARE = `mutation ($input: SetCareScheduleInput!) { setCareSchedule(input: $input) { careType } }`;
const LOG_CARE = `mutation ($input: LogCareInput!) { logCare(input: $input) { careType } }`;
const LOCK_WAIT_MS = 300;

type HeldTransaction = {
  started: Promise<void>;
  release: () => void;
  done: Promise<unknown>;
};

const settlesWithin = (
  promise: Promise<unknown>,
  ms: number,
): Promise<boolean> =>
  Promise.race([
    promise.then(() => true),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), ms)),
  ]);

describe('calendar feed (e2e)', () => {
  const harness = new PlantTestHarness();
  let aliceId: string;

  beforeAll(() => harness.init());
  afterAll(async () => {
    await harness.database.delete(calendarFeedToken);
    await harness.close();
  });
  beforeEach(async () => {
    await harness.resetPlants();
    await harness.database.update(user).set({ locale: 'fr' });
    await harness.database.delete(calendarFeedToken);
    const [alice] = await harness.database
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, 'alice@test.dev'));
    aliceId = alice?.id ?? '';
  });

  // Holds a transaction open (uncommitted) so a request can be staged behind
  // its row locks instead of hoping that parallel calls happen to overlap.
  const holdTokenInsert = (token: string): HeldTransaction => {
    let release: () => void = () => undefined;
    let started: () => void = () => undefined;
    const hold = new Promise<void>((resolve) => (release = resolve));
    const begun = new Promise<void>((resolve) => (started = resolve));
    const done = harness.database.transaction(async (tx: DatabaseExecutor) => {
      await tx.insert(calendarFeedToken).values({ userId: aliceId, token });
      started();
      await hold;
    });
    return { started: begun, release, done };
  };

  const feedFor = async (): Promise<string> => {
    const { calendarFeedToken: token } = await harness.graphql<{
      calendarFeedToken: string;
    }>(TOKEN, harness.aliceToken);
    const response = await harness.get(`/calendar-feed/${token}`);
    expect(response.status).toBe(200);
    return response.body;
  };

  describe('the feed', () => {
    it('emits a watering event for a plant with a computable next-due date', async () => {
      const { createPlant } = await harness.createPlant(
        'Monstera',
        'Monstera deliciosa',
        harness.aliceToken,
      );
      await harness.water(createPlant.id, '2026-07-08', harness.aliceToken);

      const ics = await feedFor();

      expect(ics).toContain(`UID:watering-${createPlant.id}@verdure`);
      expect(ics).toContain('SUMMARY:Arroser Monstera');
    });

    it('omits a plant never watered (no cycle to anchor a due date on)', async () => {
      await harness.createPlant('Monstera', 'Monstera', harness.aliceToken);

      expect(await feedFor()).not.toContain('BEGIN:VEVENT');
    });

    it('emits a care event alongside watering events', async () => {
      const { createPlant } = await harness.createPlant(
        'Monstera',
        'Monstera',
        harness.aliceToken,
      );
      const care = { plantId: createPlant.id, careType: 'FERTILIZING' };
      await harness.graphql(SET_CARE, harness.aliceToken, {
        input: { ...care, intervalDays: 30 },
      });
      await harness.graphql(LOG_CARE, harness.aliceToken, {
        input: { ...care, doneOn: '2026-06-15' },
      });

      const ics = await feedFor();

      expect(ics).toContain(`UID:care-${createPlant.id}-FERTILIZING@verdure`);
      expect(ics).toContain('SUMMARY:Monstera : engrais');
    });

    it('phrases titles in English for an English-speaking user', async () => {
      const { createPlant } = await harness.createPlant(
        'Monstera',
        'Monstera',
        harness.aliceToken,
      );
      await harness.water(createPlant.id, '2026-07-08', harness.aliceToken);
      await harness.database
        .update(user)
        .set({ locale: 'en' })
        .where(eq(user.id, aliceId));

      expect(await feedFor()).toContain('SUMMARY:Water Monstera');
    });

    it('answers 404 to an unknown token', async () => {
      const unknown = await harness.get(`/calendar-feed/${'0'.repeat(64)}`);
      expect(unknown.status).toBe(404);
    });
  });

  describe('the token', () => {
    it('is stable across reads and replaced by a regeneration', async () => {
      const read = (): Promise<string> =>
        harness
          .graphql<{ calendarFeedToken: string }>(TOKEN, harness.aliceToken)
          .then((data) => data.calendarFeedToken);
      const first = await read();
      expect(await read()).toBe(first);

      const { regenerateCalendarFeedToken: next } = await harness.graphql<{
        regenerateCalendarFeedToken: string;
      }>(REGENERATE, harness.aliceToken);

      expect(next).not.toBe(first);
      expect(await read()).toBe(next);
      expect((await harness.get(`/calendar-feed/${first}`)).status).toBe(404);
    });

    it('is shared by a first read that races another first read', async () => {
      const winner = 'a'.repeat(64);
      const held = holdTokenInsert(winner);
      await held.started;

      const read = harness.graphql<{ calendarFeedToken: string }>(
        TOKEN,
        harness.aliceToken,
      );
      expect(await settlesWithin(read, LOCK_WAIT_MS)).toBe(false);
      held.release();
      await held.done;

      expect((await read).calendarFeedToken).toBe(winner);
    });

    it('survives a regeneration that races a first read', async () => {
      const held = holdTokenInsert('b'.repeat(64));
      await held.started;

      const regenerate = harness.graphql<{
        regenerateCalendarFeedToken: string;
      }>(REGENERATE, harness.aliceToken);
      expect(await settlesWithin(regenerate, LOCK_WAIT_MS)).toBe(false);
      held.release();
      await held.done;

      const { regenerateCalendarFeedToken: token } = await regenerate;
      const rows = await harness.database.select().from(calendarFeedToken);
      expect(rows.map((row) => row.token)).toEqual([token]);
    });
  });
});
