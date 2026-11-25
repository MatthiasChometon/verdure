import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  BUDGET_MS,
  medianDurationMs,
} from '../../../infrastructure/testing/time-budget';
import {
  measureStatements,
  statementsAvailable,
} from '../../../infrastructure/testing/statements';
import { wateringEvent } from '../../watering/schema';
import { LatestWatering } from '../latest-watering';
import { PlantTestHarness } from '../harness';

// The plants of the home page ("to water today") and of the collection are the
// reads a person waits for first: each must stay under the read budget (UX rule
// "flow of thought kept": 1 s to the content, 300 ms for the API read) while
// OTHER accounts hold a lot of data.
//
// Seed size: 40 accounts x 100 plants x 400 waterings = 1.6 M noise rows (about
// 150 MB with indexes), against 30 own plants x 60 waterings = 1 800 own rows.
// The noise is what the old query aggregated on every read (it grouped the whole
// table); it is the largest journal that still seeds in about a minute on a CI
// runner, and the own data is a collection a keen gardener really holds.
const NOISE_USERS = 40;
const NOISE_PLANTS_PER_USER = 100;
const NOISE_WATERINGS_PER_PLANT = 400;
const OWN_PLANTS = 30;
const OWN_WATERINGS_PER_PLANT = 60;
const SEED_TIMEOUT_MS = 240_000;
const TEST_TIMEOUT_MS = 60_000;

// Pages of watering_event one read of the account may touch. Measured on the
// fixed code in CI (index scan, each heap visit counted): 28 pages for the list
// and the calendar feed, 12 for one plant. The limit is about twice the
// measured work; reading the whole table (the old query) touches more than
// 12 000, so a regression to it is two orders of magnitude over the limit.
const WORK_OWN_BLOCKS = 30;
const WORK_LIMIT_BLOCKS = 2 * WORK_OWN_BLOCKS;
// Statements one read sends: a query per plant (N+1) would send 30 or more.
const MAX_STATEMENTS = 6;

const PLANT_QUERY =
  'query ($id: ID!) { plant(id: $id) { id lastWateredOn nextDueOn } }';
const stripStamp = (ics: string): string =>
  ics
    .split(/\r?\n/)
    .filter((line) => !line.startsWith('DTSTAMP'))
    .join('\n');
describe('Plant reads stay within their time budget (e2e)', () => {
  const harness = new PlantTestHarness();
  let ownPlantId = '';
  let feedPath = '';
  let foreignDay = 0;

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
      from plant p cross join generate_series(0, ${OWN_WATERINGS_PER_PLANT - 1}) d
      where p.name like 'own%'`);
    const rows = await database.execute<{ id: string }>(
      sql`select id from plant where name = 'own1' limit 1`,
    );
    ownPlantId = rows[0]?.id ?? '';
    const { calendarFeedToken } = await harness.graphql<{
      calendarFeedToken: string;
    }>('query { calendarFeedToken }', harness.aliceToken);
    feedPath = `/calendar-feed/${calendarFeedToken}`;
    await database.execute(sql`analyze plant`);
    await database.execute(sql`analyze watering_event`);
  }, SEED_TIMEOUT_MS);

  afterAll(() => harness.close());

  // The four callers of the shared "latest watering" subquery, each through the
  // public operation that reaches it. Every read returns what it shows of the
  // account's plants, as text, to compare before and after other accounts act.
  const callers: { name: string; read: () => Promise<string> }[] = [
    {
      name: 'list findPage (plants)',
      read: async () =>
        JSON.stringify(
          await harness.graphql(
            'query { plants(limit: 12, offset: 0) { items { id lastWateredOn nextDueOn } total } }',
            harness.aliceToken,
          ),
        ),
    },
    {
      name: 'list findDue (plantsDue)',
      read: async () =>
        JSON.stringify(
          await harness.graphql(
            'query { plantsDue { id lastWateredOn nextDueOn } }',
            harness.aliceToken,
          ),
        ),
    },
    {
      name: 'save findById (plant)',
      read: async () =>
        JSON.stringify(
          await harness.graphql(PLANT_QUERY, harness.aliceToken, {
            id: ownPlantId,
          }),
        ),
    },
    {
      name: 'watering wateringRecordsFor (calendar feed)',
      read: async () => stripStamp((await harness.get(feedPath)).body),
    },
  ];

  // Regression guards, not red-first proofs: with the seed above the old query
  // still answered in about 125 ms on warm buffers (it is the volume of rows
  // read, below, that was red). They keep the read under its UX budget if a
  // later change makes it slow in another way (a missing index on `plant`, a
  // join that multiplies rows).
  it(
    `plantsDue (home page band) answers in under ${BUDGET_MS.read} ms (median, regression guard)`,
    async () => {
      const median = await medianDurationMs(async () => {
        const { plantsDue } = await harness.graphql<{
          plantsDue: { id: string }[];
        }>(
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
    `plants (collection page) answers in under ${BUDGET_MS.read} ms (median, regression guard)`,
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

  describe.each(callers)('$name', ({ name, read }) => {
    it(
      'reads only the account own waterings, in a fixed number of statements',
      async () => {
        if (!(await statementsAvailable(harness.database))) {
          // CI preloads pg_stat_statements: there, its absence is a failure.
          expect(
            process.env.CI,
            'pg_stat_statements must be enabled in CI',
          ).toBeUndefined();
          return;
        }
        await read();
        const work = await measureStatements(harness.database, read);
        const blocks = work.blocksOn('watering_event');
        console.info(
          `[perf] ${name}: ${work.calls} statements, ${blocks} watering_event pages`,
        );
        expect(blocks).toBeLessThan(WORK_LIMIT_BLOCKS);
        expect(work.calls).toBeLessThanOrEqual(MAX_STATEMENTS);
      },
      TEST_TIMEOUT_MS,
    );

    it(
      'never shows the date of another account watering on its plants',
      async () => {
        const before = await read();
        await harness.database.insert(wateringEvent).values({
          plantId: ownPlantId,
          userId:
            (
              await harness.database.execute<{ id: string }>(
                sql`select id from "user" where email = 'bob@test.dev'`,
              )
            )[0]?.id ?? '',
          // A later day each time: the plant has one watering per day at most.
          wateredOn: new Date(Date.now() + (foreignDay += 1) * 86_400_000)
            .toISOString()
            .slice(0, 10),
        });
        expect(await read()).toBe(before);
      },
      TEST_TIMEOUT_MS,
    );
  });

  it(
    'answers the latest watering through the (user, date) index',
    async () => {
      const latest = harness.resolve(LatestWatering);
      const userId =
        (
          await harness.database.execute<{ id: string }>(
            sql`select id from "user" where email = 'alice@test.dev'`,
          )
        )[0]?.id ?? '';
      const { sql: text, params } = harness.database
        .select({ plantId: latest.query(userId).plantId })
        .from(latest.query(userId))
        .toSQL();
      const inlined = text.replace(
        /\$(\d+)/g,
        (_, position: string) => `'${String(params[Number(position) - 1])}'`,
      );
      const plan = await harness.database.execute<Record<string, unknown>>(
        sql.raw(`explain (format json) ${inlined}`),
      );
      expect(JSON.stringify(plan)).toContain(
        'watering_event_user_watered_on_idx',
      );
    },
    TEST_TIMEOUT_MS,
  );
});
