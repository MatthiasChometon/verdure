import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type Database } from '../../../infrastructure/database/token';
import { BUDGET_MS, medianDurationMs } from '../../../infrastructure/testing/time-budget';
import { PlantTestHarness } from '../harness';

// The plants of the home page ("to water today") and of the collection are the
// reads a person waits for first: each must stay under the read budget (UX rule
// "flow of thought kept": 1 s to the content, 300 ms for the API read) while
// OTHER accounts hold a lot of data. 40 accounts x 100 plants x 400 waterings.
const NOISE_USERS = 40;
const NOISE_PLANTS_PER_USER = 100;
const NOISE_WATERINGS_PER_PLANT = 400;
const OWN_PLANTS = 30;
const SEED_TIMEOUT_MS = 240_000;
const TEST_TIMEOUT_MS = 60_000;

// Rows the database reads from watering_event (sequential + index tuples), seen
// through the statistics collector, which flushes a moment after the query.
const STATS_FLUSH_MS = 2000;
const wateringRowsRead = async (database: Database): Promise<number> => {
  await new Promise((resolve) => setTimeout(resolve, STATS_FLUSH_MS));
  const rows = await database.execute<{ read: string }>(
    sql`select (select coalesce(sum(seq_tup_read), 0) from pg_stat_user_tables where relname = 'watering_event') + (select coalesce(sum(idx_tup_read), 0) from pg_stat_user_indexes where relname = 'watering_event') as read`,
  );
  return Number(rows[0]?.read ?? 0);
};

describe('Plant reads stay within their time budget (e2e)', () => {
  const harness = new PlantTestHarness();

  beforeAll(async () => {
    await harness.init();
    const { database } = harness;
    await database.execute(sql`
      insert into "user" (id, email, name)
      select gen_random_uuid(), 'noise' || n || '@test.dev', 'noise' || n
      from generate_series(1, ${NOISE_USERS}) n`);
    await database.execute(sql`
      insert into plant (id, user_id, name, species, watering_interval_summer_days, watering_interval_winter_days)
      select gen_random_uuid(), u.id, 'noise' || n, 'Monstera deliciosa', 7, 14
      from "user" u cross join generate_series(1, ${NOISE_PLANTS_PER_USER}) n
      where u.email like 'noise%'`);
    await database.execute(sql`
      insert into watering_event (id, plant_id, user_id, watered_on)
      select gen_random_uuid(), p.id, p.user_id, date '2024-01-01' + d
      from plant p cross join generate_series(0, ${NOISE_WATERINGS_PER_PLANT - 1}) d
      where p.name like 'noise%'`);
    await database.execute(sql`
      insert into plant (id, user_id, name, species, watering_interval_summer_days, watering_interval_winter_days)
      select gen_random_uuid(), u.id, 'own' || n, 'Ficus lyrata', 3, 3
      from "user" u cross join generate_series(1, ${OWN_PLANTS}) n
      where u.email = 'alice@test.dev'`);
    await database.execute(sql`
      insert into watering_event (id, plant_id, user_id, watered_on)
      select gen_random_uuid(), p.id, p.user_id, current_date - 30 - d
      from plant p cross join generate_series(0, 59) d
      where p.name like 'own%'`);
    await database.execute(sql`analyze plant`);
    await database.execute(sql`analyze watering_event`);
  }, SEED_TIMEOUT_MS);

  afterAll(() => harness.close());

  it(
    `plantsDue (home page band) answers in under ${BUDGET_MS.read} ms (median)`,
    async () => {
      const median = await medianDurationMs(async () => {
        const { plantsDue } = await harness.graphql<{ plantsDue: { id: string }[] }>(
          'query { plantsDue { id name species imageUrl nextDueOn } }',
          harness.aliceToken,
        );
        expect(plantsDue).toHaveLength(OWN_PLANTS);
      });
      console.info(`[perf] plantsDue median ${median.toFixed(1)} ms`);
      expect(median).toBeLessThan(BUDGET_MS.read);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    `plants (collection page) answers in under ${BUDGET_MS.read} ms (median)`,
    async () => {
      const median = await medianDurationMs(async () => {
        const { plants } = await harness.graphql<{ plants: { total: number } }>(
          'query { plants(limit: 12, offset: 0) { items { id name imageUrl lastWateredOn nextDueOn safety(lang: "fr") { level } } total } }',
          harness.aliceToken,
        );
        expect(plants.total).toBe(OWN_PLANTS);
      });
      console.info(`[perf] plants median ${median.toFixed(1)} ms`);
      expect(median).toBeLessThan(BUDGET_MS.read);
    },
    TEST_TIMEOUT_MS,
  );

  it('plantsDue reads only the account own waterings, whatever other accounts hold', async () => {
    const before = await wateringRowsRead(harness.database);
    await harness.graphql('query { plantsDue { id } }', harness.aliceToken);
    const read = (await wateringRowsRead(harness.database)) - before;
    // Own waterings: OWN_PLANTS x 60. A scan of the whole table would read 1.6M.
    expect(read).toBeLessThan(OWN_PLANTS * 60 * 10);
  });
});
