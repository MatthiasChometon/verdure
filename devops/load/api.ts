/**
 * Load tests of the API: `k6 run -e PROFILE=load -e TOKENS=a,b,c,d,e,f api.ts`, with
 * `node stubs.mjs` running (AI api, GBIF and a mail sink stood in for at a fixed latency).
 *
 * Every GraphQL query and mutation and every REST route has a function below, tagged
 * `op:<name>` so budgets.ts can judge it: `OPERATIONS` is typed by the budget table, so a
 * budget without a call fails the typecheck, and check-coverage.mjs fails CI when an
 * operation of the API has no budget. Runs against a replica started on the CI runner,
 * NEVER against production.
 *
 * Three scenarios (profiles.ts): `person` (the visit of a person, at an arrival rate),
 * `operation` (one operation per arrival, in turn: the whole API) and `workerFlow` (the AI
 * worker's jobs, serial, on an account of their own because jobs are claimed in order).
 */
import { check, fail } from 'k6';
import encoding from 'k6/encoding';
import exec from 'k6/execution';
import http, { type RequestBody } from 'k6/http';
import type { Options } from 'k6/options';
import { type Operation } from './budgets.ts';
import { isProfile, optionsOf } from './profiles.ts';

const PROFILE = __ENV.PROFILE ?? 'smoke';
if (!isProfile(PROFILE)) fail(`Unknown profile "${PROFILE}"`);

const API_URL = (__ENV.API_URL ?? 'http://127.0.0.1:3880').replace(/\/$/, '');
const STUB_URL = (__ENV.STUB_URL ?? 'http://127.0.0.1:8001').replace(/\/$/, '');
// Session tokens of the seeded accounts (see seed.sql and sign-tokens.mjs): five people with
// a full collection (the first one is the admin), then the account of the AI worker.
const TOKENS = (__ENV.TOKENS ?? '').split(',').filter((token) => token !== '');
const PEOPLE = 5;
const PASSWORD = 'correct-horse-battery';

export const options: Options = {
  ...optionsOf(PROFILE),
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
  tags: { profile: PROFILE },
};

type Context = {
  people: { token: string; plantId: string; feedToken: string }[];
  admin: string;
  operator: string;
  workerBearer: string;
  fernId: string;
  imageKey: string;
  reportId: string;
  suggestionId: string;
  carolEmail: string;
};

// Requests that only stage what an operation consumes carry these tags and no budget.
type Tag = Operation | 'stage' | 'setup';
type Json = Record<string, unknown>;

const PNG = encoding.b64decode(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
);

const randomHex = (length: number): string =>
  Array.from({ length }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join('');
const uuid = (): string =>
  `${randomHex(8)}-${randomHex(4)}-4${randomHex(3)}-a${randomHex(3)}-${randomHex(12)}`;
// The API throttles per client address, which is no budget under test: a fresh one per call.
const clientIp = (): string =>
  `10.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${1 + Math.floor(Math.random() * 254)}`;
const unique = (): string =>
  `${exec.vu.idInTest}-${exec.vu.iterationInInstance}-${randomHex(6)}`;
const isoDay = (offsetDays: number): string =>
  new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
const turn = (): number => exec.scenario.iterationInTest;

const CONTEXT = {
  page: '/',
  userAgent: 'load-test',
  viewport: '390x844',
  locale: 'fr',
};

const parse = (body: unknown): Json | undefined => {
  try {
    return JSON.parse(String(body)) as Json;
  } catch {
    return undefined;
  }
};

// ---- HTTP -----------------------------------------------------------------------------

type Reply = { status: number; json?: Json };

const verdict = (tag: Tag, label: string, ok: boolean): void => {
  check(null, { [`${tag}: ${label}`]: () => ok }, { op: tag });
};

const graphql = (
  tag: Tag,
  query: string,
  token: string,
  variables: Json = {},
): Json | undefined => {
  const response = http.post(
    `${API_URL}/graphql`,
    JSON.stringify({ query, variables }),
    {
      headers: {
        'Content-Type': 'application/json',
        Cookie: `auth_token=${token}`,
      },
      tags: { op: tag },
    },
  );
  const body = response.status === 200 ? parse(response.body) : undefined;
  const data = body?.data as Json | undefined;
  verdict(
    tag,
    '200, data and no errors',
    data !== undefined && body?.errors === undefined,
  );
  return data;
};

type RestOptions = {
  body?: RequestBody;
  headers?: Record<string, string>;
  // Statuses that are the expected answer (a redirect, a 204).
  statuses?: number[];
};

const rest = (
  tag: Tag,
  method: 'GET' | 'POST',
  path: string,
  options: RestOptions = {},
): Reply => {
  const statuses = options.statuses ?? [200, 201, 204];
  const response = http.request(
    method,
    `${API_URL}${path}`,
    options.body ?? null,
    {
      headers: { 'x-forwarded-for': clientIp(), ...options.headers },
      redirects: 0,
      tags: { op: tag },
      responseCallback: http.expectedStatuses(...statuses),
    },
  );
  verdict(
    tag,
    `status ${statuses.join('/')}`,
    statuses.includes(response.status),
  );
  return { status: response.status, json: parse(response.body) };
};

const post = (
  tag: Tag,
  path: string,
  body: Json,
  extra: RestOptions = {},
): Reply =>
  rest(tag, 'POST', path, {
    ...extra,
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', ...extra.headers },
  });

const upload = (tag: Tag, path: string, token: string): Reply =>
  rest(tag, 'POST', path, {
    body: { file: http.file(PNG, 'photo.png', 'image/png') },
    headers: { Cookie: `auth_token=${token}` },
  });

// ---- Setup ----------------------------------------------------------------------------

const waitForToken = (email: string, not = ''): string => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const response = http.get(
      `${STUB_URL}/mail/token?to=${encodeURIComponent(email)}`,
      {
        tags: { op: 'setup' },
      },
    );
    const token = response.status === 200 ? String(response.body) : '';
    if (token !== '' && token !== not) return token;
    // The mail is sent in the background: poll the sink, 100 ms apart.
    http.get(`${STUB_URL}/sleep?ms=100`, { tags: { op: 'setup' } });
  }
  return fail(`No e-mail reached the sink for ${email}`);
};

const registerAndVerify = (email: string): void => {
  post('setup', '/auth/register', { email, password: PASSWORD, name: 'Load' });
  post('setup', '/auth/verify-email', { token: waitForToken(email) });
};

const idOf = (data: Json | undefined, field: string): string =>
  String((data?.[field] as Json | undefined)?.id ?? fail(`${field} failed`));

export const setup = (): Context => {
  if (http.get(`${API_URL}/health`).status !== 200)
    fail(`The API at ${API_URL} is not up`);
  if (TOKENS.length < PEOPLE + 1)
    fail('TOKENS needs 6 tokens: run sign-tokens.mjs after seed.sql');
  const people = TOKENS.slice(0, PEOPLE).map((token) => {
    const feed = graphql('setup', 'query { calendarFeedToken }', token);
    const page = graphql(
      'setup',
      'query { plants(limit: 12, offset: 0) { items { id } } }',
      token,
    );
    const items =
      (page?.plants as { items: { id: string }[] } | undefined)?.items ?? [];
    return {
      token,
      plantId: items[0]?.id ?? fail('A seeded account has no plant'),
      feedToken: String(feed?.calendarFeedToken ?? ''),
    };
  });
  const admin = TOKENS[0] ?? fail('no token');
  const operator = TOKENS[PEOPLE] ?? fail('no token');

  const image = upload('setup', '/uploads/plant-image', operator);
  const imageKey = String(image.json?.key ?? fail('The photo was not stored'));
  const fern = graphql(
    'setup',
    'mutation ($input: CreatePlantInput!) { createPlant(input: $input) { id } }',
    operator,
    { input: { name: 'Fern', species: 'Nephrolepis exaltata', imageKey } },
  );
  const worker = graphql(
    'setup',
    'mutation { createWorkerToken(label: "load") { token } }',
    operator,
  );
  const report = graphql(
    'setup',
    'mutation ($input: ReportBugInput!) { reportBug(input: $input) { id } }',
    admin,
    { input: { message: 'staged', severity: 'ANNOYING', context: CONTEXT } },
  );
  const suggestion = graphql(
    'setup',
    'mutation ($input: RequestImprovementInput!) { requestImprovement(input: $input) { id } }',
    admin,
    {
      input: {
        message: 'staged',
        importance: 'NICE_TO_HAVE',
        context: CONTEXT,
      },
    },
  );
  const carolEmail = `carol-${randomHex(6)}@load.test`;
  registerAndVerify(carolEmail);
  return {
    people,
    admin,
    operator,
    workerBearer: String(
      (worker?.createWorkerToken as Json | undefined)?.token ??
        fail('no worker token'),
    ),
    fernId: idOf(fern, 'createPlant'),
    imageKey,
    reportId: idOf(report, 'reportBug'),
    suggestionId: idOf(suggestion, 'requestImprovement'),
    carolEmail,
  };
};

// ---- The AI worker's side, shared by the worker operations ----------------------------

const bearer = (ctx: Context): Record<string, string> => ({
  Authorization: `Bearer ${ctx.workerBearer}`,
});

// Any authenticated worker call marks the worker online, which is what "local" mode needs.
const showWorker = (ctx: Context): void => {
  post('stage', `/worker/jobs/${uuid()}/failed`, {}, { headers: bearer(ctx) });
};

const requestIdentification = (tag: Tag, ctx: Context): string => {
  const reply = rest(
    tag,
    'POST',
    '/uploads/request-identification?mode=local',
    {
      body: { file: http.file(PNG, 'photo.png', 'image/png') },
      headers: { Cookie: `auth_token=${ctx.operator}` },
    },
  );
  return String(reply.json?.jobId ?? '');
};

const diagnose = (tag: Tag, ctx: Context): string => {
  const data = graphql(
    tag,
    'mutation ($plantId: ID!) { diagnosePlant(plantId: $plantId) { id status } }',
    ctx.operator,
    { plantId: ctx.fernId },
  );
  return String((data?.diagnosePlant as Json | undefined)?.id ?? '');
};

type Job = { jobId: string; kind: string };

// The worker polls and gets the oldest job: what the API hands over, kind included.
const claim = (tag: Tag, ctx: Context): Job => {
  const reply = rest(tag, 'GET', '/worker/next-job', { headers: bearer(ctx) });
  return {
    jobId: String(reply.json?.jobId ?? ''),
    kind: String(reply.json?.kind ?? ''),
  };
};

// Leaves the queue empty for the next operation: the claimed job is reported failed.
const settle = (ctx: Context, job: Job = claim('stage', ctx)): void => {
  const route = job.kind === 'diagnose' ? 'diagnosis-failed' : 'failed';
  post(
    'stage',
    `/worker/jobs/${job.jobId}/${route}`,
    {},
    { headers: bearer(ctx) },
  );
};

const claimedIdentification = (ctx: Context): Job => {
  showWorker(ctx);
  requestIdentification('stage', ctx);
  return claim('stage', ctx);
};
const claimedDiagnosis = (ctx: Context): Job => {
  diagnose('stage', ctx);
  return claim('stage', ctx);
};

// ---- Every operation ------------------------------------------------------------------

const pick = (ctx: Context): Context['people'][number] =>
  ctx.people[turn() % PEOPLE] ?? fail('no person');
const plantOf = (ctx: Context): string => pick(ctx).plantId;
const input = (value: Json): Json => ({ input: value });
// A day of its own: watering twice on one day changes nothing.
const oldDay = (): string => isoDay(-(400 + (turn() % 3000)));

const query =
  (
    tag: Tag,
    text: string,
    variables: (ctx: Context) => Json = () => ({}),
    admin = false,
  ) =>
  (ctx: Context): void => {
    graphql(tag, text, admin ? ctx.admin : pick(ctx).token, variables(ctx));
  };

const mutation =
  (tag: Tag, text: string, variables: (ctx: Context) => Json, admin = false) =>
  (ctx: Context): void => {
    graphql(tag, text, admin ? ctx.admin : pick(ctx).token, variables(ctx));
  };

const pairing = (): { code: string; secret: string } => {
  const reply = post('stage', '/worker/pair/start', { label: 'load' });
  return {
    code: String(reply.json?.code ?? ''),
    secret: String(reply.json?.secret ?? ''),
  };
};

const registered = (): string => {
  const email = `new-${unique()}@load.test`;
  post('stage', '/auth/register', { email, password: PASSWORD, name: 'New' });
  return email;
};

const WATER =
  'mutation ($input: WaterPlantInput!) { waterPlant(input: $input) { id lastWateredOn nextDueOn } }';

const OPERATIONS: Record<Operation, (ctx: Context) => void> = {
  // GraphQL queries.
  aiWorkerOnline: query('aiWorkerOnline', 'query { aiWorkerOnline }'),
  amIAdmin: query('amIAdmin', 'query { amIAdmin }'),
  bugReports: query(
    'bugReports',
    'query { bugReports { id message } }',
    () => ({}),
    true,
  ),
  calendarFeedToken: query('calendarFeedToken', 'query { calendarFeedToken }'),
  careSchedules: query(
    'careSchedules',
    'query ($plantId: ID!) { careSchedules(plantId: $plantId) { id careType } }',
    (ctx) => ({ plantId: plantOf(ctx) }),
  ),
  diagnosisJob: (ctx) => {
    const id = diagnose('stage', ctx);
    graphql(
      'diagnosisJob',
      'query ($id: ID!) { diagnosisJob(id: $id) { id status } }',
      ctx.operator,
      { id },
    );
    settle(ctx);
  },
  googleEnabled: query('googleEnabled', 'query { googleEnabled }'),
  identificationJob: (ctx) => {
    showWorker(ctx);
    const id = requestIdentification('stage', ctx);
    graphql(
      'identificationJob',
      'query ($id: ID!) { identificationJob(id: $id) { id status species } }',
      ctx.operator,
      { id },
    );
    settle(ctx);
  },
  improvementRequests: query(
    'improvementRequests',
    'query { improvementRequests { id message } }',
    () => ({}),
    true,
  ),
  journalEntries: query(
    'journalEntries',
    'query ($plantId: ID!) { journalEntries(plantId: $plantId) { id kind } }',
    (ctx) => ({ plantId: plantOf(ctx) }),
  ),
  me: query('me', 'query { me { id email name hasPlantnetKey } }'),
  pendingPairing: (ctx) => {
    const { code } = pairing();
    graphql(
      'pendingPairing',
      'query ($code: String!) { pendingPairing(code: $code) { code label } }',
      pick(ctx).token,
      { code },
    );
  },
  plant: query(
    'plant',
    'query ($id: ID!) { plant(id: $id) { id name species lastWateredOn nextDueOn } }',
    (ctx) => ({ id: plantOf(ctx) }),
  ),
  plantFacets: query(
    'plantFacets',
    'query { plantFacets { genera { value count } withImage withoutImage } }',
  ),
  plants: query(
    'plants',
    'query { plants(limit: 12, offset: 0) { items { id name species imageUrl lastWateredOn nextDueOn } total } }',
  ),
  plantsDue: query(
    'plantsDue',
    'query { plantsDue { id name species imageUrl nextDueOn } }',
  ),
  speciesAdvice: query(
    'speciesAdvice',
    'query { speciesAdvice(species: "Monstera deliciosa", lang: "fr") { safety { level } } }',
  ),
  speciesSuggestions: query(
    'speciesSuggestions',
    'query { speciesSuggestions(search: "monstera") { name } }',
  ),
  suggestPlantName: query(
    'suggestPlantName',
    'query { suggestPlantName(species: "Monstera deliciosa", lang: "fr") }',
  ),
  wateringDefault: query(
    'wateringDefault',
    'query { wateringDefault(species: "Monstera deliciosa") { summerDays winterDays } }',
  ),
  wateringEvents: query(
    'wateringEvents',
    'query ($from: String!, $to: String!) { wateringEvents(from: $from, to: $to) { id plantId wateredOn } }',
    () => ({ from: isoDay(-30), to: isoDay(30) }),
  ),
  webPushPublicKey: query('webPushPublicKey', 'query { webPushPublicKey }'),
  workerTokens: query(
    'workerTokens',
    'query { workerTokens { id label online } }',
  ),

  // GraphQL mutations.
  addJournalEntry: mutation(
    'addJournalEntry',
    'mutation ($input: AddJournalEntryInput!) { addJournalEntry(input: $input) { id } }',
    (ctx) => input({ plantId: plantOf(ctx), kind: 'NOTE', note: 'load' }),
  ),
  approvePairing: (ctx) => {
    graphql(
      'approvePairing',
      'mutation ($code: String!) { approvePairing(code: $code) }',
      pick(ctx).token,
      { code: pairing().code },
    );
  },
  blockReporter: mutation(
    'blockReporter',
    'mutation ($input: BlockReporterInput!) { blockReporter(input: $input) }',
    (ctx) => input({ reportId: ctx.reportId, blocked: turn() % 2 === 0 }),
    true,
  ),
  createPlant: mutation(
    'createPlant',
    'mutation ($input: CreatePlantInput!) { createPlant(input: $input) { id } }',
    () => input({ name: 'Load', species: 'Ficus lyrata' }),
  ),
  createWorkerToken: mutation(
    'createWorkerToken',
    'mutation { createWorkerToken(label: "load") { id token } }',
    () => ({}),
  ),
  deleteJournalEntry: (ctx) => {
    const added = graphql(
      'stage',
      'mutation ($input: AddJournalEntryInput!) { addJournalEntry(input: $input) { id } }',
      pick(ctx).token,
      input({ plantId: plantOf(ctx), kind: 'NOTE', note: 'to delete' }),
    );
    graphql(
      'deleteJournalEntry',
      'mutation ($id: ID!) { deleteJournalEntry(id: $id) }',
      pick(ctx).token,
      { id: String((added?.addJournalEntry as Json | undefined)?.id ?? '') },
    );
  },
  deletePlant: (ctx) => {
    const created = graphql(
      'stage',
      'mutation ($input: CreatePlantInput!) { createPlant(input: $input) { id } }',
      pick(ctx).token,
      input({ name: 'Staged', species: 'Ficus lyrata' }),
    );
    graphql(
      'deletePlant',
      'mutation ($id: ID!) { deletePlant(id: $id) }',
      pick(ctx).token,
      { id: String((created?.createPlant as Json | undefined)?.id ?? '') },
    );
  },
  deleteWateringEvent: (ctx) => {
    const day = oldDay();
    graphql(
      'stage',
      WATER,
      pick(ctx).token,
      input({ plantId: plantOf(ctx), wateredOn: day }),
    );
    const events = graphql(
      'stage',
      'query ($from: String!, $to: String!) { wateringEvents(from: $from, to: $to) { id plantId } }',
      pick(ctx).token,
      { from: day, to: day },
    );
    const found = (
      events?.wateringEvents as { id: string; plantId: string }[] | undefined
    )?.find((event) => event.plantId === plantOf(ctx));
    graphql(
      'deleteWateringEvent',
      'mutation ($id: ID!) { deleteWateringEvent(id: $id) }',
      pick(ctx).token,
      { id: found?.id ?? uuid() },
    );
  },
  denyPairing: (ctx) => {
    graphql(
      'denyPairing',
      'mutation ($code: String!) { denyPairing(code: $code) }',
      pick(ctx).token,
      { code: pairing().code },
    );
  },
  diagnosePlant: (ctx) => {
    diagnose('diagnosePlant', ctx);
    settle(ctx);
  },
  logCare: mutation(
    'logCare',
    'mutation ($input: LogCareInput!) { logCare(input: $input) { id } }',
    (ctx) => input({ careType: 'ROTATING', plantId: plantOf(ctx) }),
  ),
  regenerateCalendarFeedToken: (ctx) => {
    // The operator's own feed: the people's tokens are what `person` reads.
    graphql(
      'regenerateCalendarFeedToken',
      'mutation { regenerateCalendarFeedToken }',
      ctx.operator,
    );
  },
  removeCareSchedule: (ctx) => {
    graphql(
      'stage',
      'mutation ($input: SetCareScheduleInput!) { setCareSchedule(input: $input) { id } }',
      pick(ctx).token,
      input({ careType: 'MISTING', intervalDays: 7, plantId: plantOf(ctx) }),
    );
    graphql(
      'removeCareSchedule',
      'mutation ($input: RemoveCareScheduleInput!) { removeCareSchedule(input: $input) }',
      pick(ctx).token,
      input({ careType: 'MISTING', plantId: plantOf(ctx) }),
    );
  },
  reportBug: mutation(
    'reportBug',
    'mutation ($input: ReportBugInput!) { reportBug(input: $input) { id } }',
    () => input({ message: 'load', severity: 'ANNOYING', context: CONTEXT }),
  ),
  requestImprovement: mutation(
    'requestImprovement',
    'mutation ($input: RequestImprovementInput!) { requestImprovement(input: $input) { id } }',
    () =>
      input({ message: 'load', importance: 'NICE_TO_HAVE', context: CONTEXT }),
  ),
  revokeWorkerToken: (ctx) => {
    const created = graphql(
      'stage',
      'mutation { createWorkerToken(label: "throwaway") { id } }',
      pick(ctx).token,
    );
    graphql(
      'revokeWorkerToken',
      'mutation ($id: ID!) { revokeWorkerToken(id: $id) }',
      pick(ctx).token,
      {
        id: String((created?.createWorkerToken as Json | undefined)?.id ?? ''),
      },
    );
  },
  setBugStatus: mutation(
    'setBugStatus',
    'mutation ($input: BugStatusInput!) { setBugStatus(input: $input) { id status } }',
    (ctx) =>
      input({ id: ctx.reportId, status: turn() % 2 === 0 ? 'FIXED' : 'NEW' }),
    true,
  ),
  setCareSchedule: mutation(
    'setCareSchedule',
    'mutation ($input: SetCareScheduleInput!) { setCareSchedule(input: $input) { id } }',
    (ctx) =>
      input({
        careType: 'FERTILIZING',
        intervalDays: 30,
        plantId: plantOf(ctx),
      }),
  ),
  setImprovementStatus: mutation(
    'setImprovementStatus',
    'mutation ($input: ImprovementStatusInput!) { setImprovementStatus(input: $input) { id status } }',
    (ctx) =>
      input({
        id: ctx.suggestionId,
        status: turn() % 2 === 0 ? 'PLANNED' : 'NEW',
      }),
    true,
  ),
  setPlantnetApiKey: mutation(
    'setPlantnetApiKey',
    'mutation ($key: String) { setPlantnetApiKey(key: $key) }',
    () => ({ key: null }),
  ),
  subscribeToPush: mutation(
    'subscribeToPush',
    'mutation ($input: PushSubscriptionInput!) { subscribeToPush(input: $input) }',
    () =>
      input({
        endpoint: 'https://push.example.test/load',
        p256dh: 'p256dh-key',
        auth: 'auth-key',
      }),
  ),
  unsubscribeFromPush: mutation(
    'unsubscribeFromPush',
    'mutation ($endpoint: String!) { unsubscribeFromPush(endpoint: $endpoint) }',
    () => ({ endpoint: 'https://push.example.test/load' }),
  ),
  updatePlant: mutation(
    'updatePlant',
    'mutation ($input: UpdatePlantInput!) { updatePlant(input: $input) { id } }',
    (ctx) =>
      input({ id: plantOf(ctx), name: 'Renamed', species: 'Ficus lyrata' }),
  ),
  waterPlant: mutation('waterPlant', WATER, (ctx) =>
    input({ plantId: plantOf(ctx), wateredOn: oldDay() }),
  ),

  // REST routes.
  GET_health: () => void rest('GET_health', 'GET', '/health'),
  GET_health_ready: () => void rest('GET_health_ready', 'GET', '/health/ready'),
  GET_calendar_feed_token: (ctx) => {
    const reply = http.get(`${API_URL}/calendar-feed/${pick(ctx).feedToken}`, {
      tags: { op: 'GET_calendar_feed_token' },
    });
    verdict(
      'GET_calendar_feed_token',
      '200 and ics',
      reply.status === 200 && String(reply.body).startsWith('BEGIN:VCALENDAR'),
    );
  },
  GET_images_key: (ctx) =>
    void rest('GET_images_key', 'GET', `/images/${ctx.imageKey}`),
  POST_auth_register: () => {
    post('POST_auth_register', '/auth/register', {
      email: `new-${unique()}@load.test`,
      password: PASSWORD,
      name: 'New',
    });
  },
  POST_auth_login: (ctx) => {
    post('POST_auth_login', '/auth/login', {
      email: ctx.carolEmail,
      password: PASSWORD,
    });
  },
  POST_auth_logout: (ctx) => {
    rest('POST_auth_logout', 'POST', '/auth/logout', {
      headers: { Cookie: `auth_token=${pick(ctx).token}` },
    });
  },
  POST_auth_verify_email: () => {
    const email = registered();
    post('POST_auth_verify_email', '/auth/verify-email', {
      token: waitForToken(email),
    });
  },
  POST_auth_resend_verification: () => {
    post('POST_auth_resend_verification', '/auth/resend-verification', {
      email: registered(),
    });
  },
  POST_auth_forgot_password: (ctx) => {
    post('POST_auth_forgot_password', '/auth/forgot-password', {
      email: ctx.carolEmail,
    });
  },
  POST_auth_reset_password: () => {
    const email = registered();
    const first = waitForToken(email);
    post('stage', '/auth/forgot-password', { email });
    post('POST_auth_reset_password', '/auth/reset-password', {
      token: waitForToken(email, first),
      password: PASSWORD,
    });
  },
  GET_auth_google: () => {
    rest('GET_auth_google', 'GET', '/auth/google', { statuses: [302] });
  },
  GET_auth_google_callback: () => {
    rest(
      'GET_auth_google_callback',
      'GET',
      '/auth/google/callback?code=load&state=load',
      {
        headers: { Cookie: 'oauth_state=load' },
        statuses: [302],
      },
    );
  },
  POST_worker_pair_start: () => {
    post('POST_worker_pair_start', '/worker/pair/start', { label: 'load' });
  },
  POST_worker_pair_poll: () => {
    post('POST_worker_pair_poll', '/worker/pair/poll', {
      secret: pairing().secret,
    });
  },
  GET_worker_next_job: (ctx) => {
    showWorker(ctx);
    requestIdentification('stage', ctx);
    settle(ctx, claim('GET_worker_next_job', ctx));
  },
  POST_worker_jobs_id_result: (ctx) => {
    const job = claimedIdentification(ctx);
    post(
      'POST_worker_jobs_id_result',
      `/worker/jobs/${job.jobId}/result`,
      { species: 'Monstera deliciosa' },
      { headers: bearer(ctx) },
    );
  },
  POST_worker_jobs_id_diagnosis: (ctx) => {
    const job = claimedDiagnosis(ctx);
    post(
      'POST_worker_jobs_id_diagnosis',
      `/worker/jobs/${job.jobId}/diagnosis`,
      { diagnosis: 'Water a little less.' },
      { headers: bearer(ctx) },
    );
  },
  // The replica embeds inline (the AI stub answers), so no embed job is ever queued: the
  // route is measured on a job it does not know, which still runs its guard and lookup.
  POST_worker_jobs_id_embedding: (ctx) => {
    post(
      'POST_worker_jobs_id_embedding',
      `/worker/jobs/${uuid()}/embedding`,
      { embedding: [0.1, 0.2, 0.3] },
      { headers: bearer(ctx) },
    );
  },
  POST_worker_jobs_id_failed: (ctx) => {
    const job = claimedIdentification(ctx);
    post(
      'POST_worker_jobs_id_failed',
      `/worker/jobs/${job.jobId}/failed`,
      {},
      { headers: bearer(ctx) },
    );
  },
  POST_worker_jobs_id_diagnosis_failed: (ctx) => {
    const job = claimedDiagnosis(ctx);
    post(
      'POST_worker_jobs_id_diagnosis_failed',
      `/worker/jobs/${job.jobId}/diagnosis-failed`,
      {},
      { headers: bearer(ctx) },
    );
  },
  POST_uploads_request_identification: (ctx) => {
    showWorker(ctx);
    requestIdentification('POST_uploads_request_identification', ctx);
    settle(ctx);
  },
  POST_uploads_identify_plant: (ctx) => {
    upload(
      'POST_uploads_identify_plant',
      '/uploads/identify-plant',
      pick(ctx).token,
    );
  },
  POST_uploads_plant_image: (ctx) => {
    upload('POST_uploads_plant_image', '/uploads/plant-image', pick(ctx).token);
  },
  POST_uploads_bug_image: (ctx) => {
    upload('POST_uploads_bug_image', '/uploads/bug-image', pick(ctx).token);
  },
};

// The AI worker's jobs are claimed in order, so these run one at a time on the operator's
// account; every other operation can overlap with any other.
const WORKER_OPERATIONS: Operation[] = [
  'diagnosisJob',
  'diagnosePlant',
  'identificationJob',
  'GET_worker_next_job',
  'POST_worker_jobs_id_result',
  'POST_worker_jobs_id_diagnosis',
  'POST_worker_jobs_id_embedding',
  'POST_worker_jobs_id_failed',
  'POST_worker_jobs_id_diagnosis_failed',
  'POST_uploads_request_identification',
];
const OTHERS = (Object.keys(OPERATIONS) as Operation[]).filter(
  (tag) => !WORKER_OPERATIONS.includes(tag),
);

export const operation = (ctx: Context): void => {
  OPERATIONS[OTHERS[turn() % OTHERS.length] ?? fail('no operation')](ctx);
};

export const workerFlow = (ctx: Context): void => {
  OPERATIONS[
    WORKER_OPERATIONS[turn() % WORKER_OPERATIONS.length] ?? fail('no operation')
  ](ctx);
};

// One person's visit, 11 requests: the home page, the collection, a plant, the calendar and
// a watering (profiles.ts derives the arrival rates from it).
export const person = (ctx: Context): void => {
  const me = pick(ctx);
  OPERATIONS.GET_health(ctx);
  for (const tag of [
    'me',
    'plantsDue',
    'plants',
    'plantFacets',
    'wateringEvents',
    'calendarFeedToken',
    'plant',
  ] as const) {
    OPERATIONS[tag](ctx);
  }
  graphql('waterPlant', WATER, me.token, input({ plantId: me.plantId }));
  OPERATIONS.GET_calendar_feed_token(ctx);
};
