/**
 * Load tests of the API: `k6 run -e PROFILE=load -e API_URL=http://127.0.0.1:3880 -e TOKENS=a,b,c api.ts`.
 * One step per operation, each request tagged `op:<name>` so budgets.ts can judge it.
 * Runs against a replica started on the CI runner, NEVER against production.
 */
import { check, fail, sleep } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';
import type { Options } from 'k6/options';
import { isProfile, optionsOf } from './profiles.ts';

const PROFILE = __ENV.PROFILE ?? 'smoke';
if (!isProfile(PROFILE)) fail(`Unknown profile "${PROFILE}"`);

const API_URL = (__ENV.API_URL ?? 'http://127.0.0.1:3880').replace(/\/$/, '');
// Session tokens of the seeded accounts (see seed.sql and sign-tokens.mjs).
const TOKENS = (__ENV.TOKENS ?? '').split(',').filter((token) => token !== '');

export const options: Options = {
  ...optionsOf(PROFILE),
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
  tags: { profile: PROFILE },
};

type Setup = { feedTokens: string[]; plantIds: string[][] };

type GraphqlBody = { data?: Record<string, unknown>; errors?: unknown[] };

const graphql = (
  op: string,
  query: string,
  token: string,
  variables: Record<string, unknown> = {},
): GraphqlBody | undefined => {
  const response = http.post(
    `${API_URL}/graphql`,
    JSON.stringify({ query, variables }),
    {
      headers: {
        'Content-Type': 'application/json',
        Cookie: `auth_token=${token}`,
      },
      tags: { op },
    },
  );
  const body =
    response.status === 200 ? (response.json() as GraphqlBody) : undefined;
  check(response, {
    [`${op}: 200`]: (current) => current.status === 200,
    [`${op}: data and no errors`]: () =>
      body?.data !== undefined && body.errors === undefined,
  });
  return body;
};

const PLANTS =
  'query { plants(limit: 12, offset: 0) { items { id name species imageUrl lastWateredOn nextDueOn safety(lang: "fr") { level } } total } }';
const PLANTS_DUE = 'query { plantsDue { id name species imageUrl nextDueOn } }';
const FACETS =
  'query { plantFacets { genera { value count } withImage withoutImage } }';
const PLANT =
  'query ($id: ID!) { plant(id: $id) { id name species description nextDueOn } }';
const EVENTS =
  'query ($from: String!, $to: String!) { wateringEvents(from: $from, to: $to) { id plantId wateredOn } }';
const WATER =
  'mutation ($input: WaterPlantInput!) { waterPlant(input: $input) { id lastWateredOn nextDueOn } }';

export const setup = (): Setup => {
  if (http.get(`${API_URL}/health`).status !== 200)
    fail(`The API at ${API_URL} is not up`);
  if (TOKENS.length === 0)
    fail('TOKENS is empty: run sign-tokens.mjs after seed.sql');
  const feedTokens: string[] = [];
  const plantIds: string[][] = [];
  for (const token of TOKENS) {
    const feed = graphql('setup', 'query { calendarFeedToken }', token);
    feedTokens.push(String(feed?.data?.calendarFeedToken ?? ''));
    const page = graphql(
      'setup',
      'query { plants(limit: 12, offset: 0) { items { id } } }',
      token,
    );
    const items =
      (page?.data?.plants as { items: { id: string }[] } | undefined)?.items ??
      [];
    plantIds.push(items.map((item) => item.id));
  }
  return { feedTokens, plantIds };
};

const isoDay = (offsetDays: number): string =>
  new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

// One person's visit: the home page, the collection, a plant, the calendar, a watering.
export const person = (setupData: Setup): void => {
  const account = (exec.vu.idInTest - 1) % TOKENS.length;
  const token = TOKENS[account] ?? fail('no token');
  const plantId = setupData.plantIds[account]?.[0];

  const health = http.get(`${API_URL}/health`, { tags: { op: 'health' } });
  check(health, { 'health: 200': (current) => current.status === 200 });

  graphql('me', 'query { me { id name } }', token);
  graphql('plantsDue', PLANTS_DUE, token);
  graphql('plants', PLANTS, token);
  graphql('plantFacets', FACETS, token);
  graphql('wateringEvents', EVENTS, token, {
    from: isoDay(-30),
    to: isoDay(30),
  });
  graphql('calendarFeedToken', 'query { calendarFeedToken }', token);
  if (plantId !== undefined) {
    graphql('plant', PLANT, token, { id: plantId });
    graphql('waterPlant', WATER, token, { input: { plantId } });
  }

  const feed = http.get(
    `${API_URL}/calendar-feed/${setupData.feedTokens[account] ?? ''}`,
    {
      tags: { op: 'calendarFeed' },
    },
  );
  check(feed, {
    'calendarFeed: 200 and ics': (current) =>
      current.status === 200 &&
      String(current.body).startsWith('BEGIN:VCALENDAR'),
  });

  // A person reads a screen for a few seconds before the next visit: 30 users at 1 visit
  // per second would be 30 people with no think time at all.
  sleep(5);
};
