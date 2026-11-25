import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JwtService } from '@nestjs/jwt';
import { sql } from 'drizzle-orm';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AiService } from '../../infrastructure/ai/service';
import { insertedRow } from '../../infrastructure/database/inserted-row';
import { type Database } from '../../infrastructure/database/token';
import { FileStorageService } from '../../infrastructure/file-storage/service';
import { IdentificationService } from '../../infrastructure/identification/service';
import { MailService } from '../../infrastructure/mail/service';
import { TaxonomyService } from '../../infrastructure/taxonomy/service';
import { bootTestApp } from '../../infrastructure/testing/test-app';
import {
  BUDGET_MS,
  medianDurationMs,
} from '../../infrastructure/testing/time-budget';
import { BackgroundTasks } from '../../infrastructure/background/service';
import { recognitionJob } from '../aiWorker/job/schema';
import { RecognitionStatus } from '../aiWorker/job/enum';
import { FileStorageStub } from '../aiWorker/harness';
import { SessionCookie } from '../auth/currentUser/cookie';
import { GoogleOAuth } from '../auth/google/service';
import { GoogleStub } from '../auth/emailAndPassword/google.stub';
import { MailStub } from '../auth/emailAndPassword/mail.stub';
import { ADMIN_EMAIL } from '../bugReport/harness';
import { AiStub } from '../plant/ai.stub';
import { plant } from '../plant/schema';
import { user } from '../user/schema';
import { insertTestUser } from '../user/test-user';
import { wateringEvent } from '../watering/schema';

// Every operation the API serves answers within its UX budget (read 300 ms, mutation
// 250 ms: docs/plans/refactor-socle.md, "Performance lot"), measured as the median of
// SAMPLES calls on a seeded database. One entry per GraphQL query and mutation and
// per REST route; the coverage tests below fail when the API gains one that has no entry.
type Kind = keyof typeof BUDGET_MS;
type Operation = {
  name: string;
  kind: Kind;
  // Untimed: stages what the call consumes (a plant to delete, a pairing to approve).
  prepare?: () => Promise<void>;
  call: () => Promise<void>;
};

const TEST_TIMEOUT_MS = 60_000;
const SETUP_TIMEOUT_MS = 120_000;
const BOUNDARY = 'budget-boundary';
const CONTEXT = {
  page: '/',
  userAgent: 'budget-test',
  viewport: '390x844',
  locale: 'fr',
};
const PASSWORD = 'correct-horse-battery';

const multipart = (contentType: string): Buffer =>
  Buffer.concat([
    Buffer.from(
      `--${BOUNDARY}\r\nContent-Disposition: form-data; name="file"; filename="photo"\r\nContent-Type: ${contentType}\r\n\r\n`,
    ),
    Buffer.from('image-bytes'),
    Buffer.from(`\r\n--${BOUNDARY}--\r\n`),
  ]);

// The worker answers at once: the vision model and GBIF are the external boundaries.
class VisionStub {
  identifyPlant(): Promise<string | undefined> {
    return Promise.resolve('Monstera deliciosa');
  }
}
class TaxonomyStub {
  suggest(): Promise<{ key: number; name: string }[]> {
    return Promise.resolve([{ key: 1, name: 'Monstera deliciosa' }]);
  }
}

const sourcesUnder = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === 'node_modules' ? [] : sourcesUnder(path);
    }
    return /\.ts$/.test(entry.name) && !/\.test\.ts$/.test(entry.name)
      ? [path]
      : [];
  });

// "METHOD /prefix/path" of every REST route the controllers declare.
const declaredRoutes = (): string[] =>
  ['domain', 'infrastructure'].flatMap((root) =>
    sourcesUnder(root).flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      const prefix = /@Controller\('([^']*)'\)/.exec(source)?.[1];
      if (prefix === undefined) {
        return [];
      }
      return [...source.matchAll(/@(Get|Post)\((?:'([^']*)')?\)/g)].map(
        ([, method, path]) =>
          `${(method ?? '').toUpperCase()} /${[prefix, path].filter(Boolean).join('/')}`,
      );
    }),
  );

// "Query.name" / "Mutation.name" of every GraphQL operation the schema declares.
const declaredOperations = (): string[] => {
  const schema = readFileSync(
    'infrastructure/graphql/schema.gql',
    'utf8',
  ).replace(/"""[\s\S]*?"""/g, '');
  return ['Query', 'Mutation'].flatMap((root) => {
    const body = new RegExp(`type ${root} \\{([\\s\\S]*?)\\n\\}`).exec(
      schema,
    )?.[1];
    return [...(body ?? '').matchAll(/^\s{2}(\w+)/gm)].map(
      ([, field]) => `${root}.${field}`,
    );
  });
};

describe('Every API operation stays within its time budget (e2e)', () => {
  const mail = new MailStub();
  const storage = new FileStorageStub();
  let app: NestFastifyApplication;
  let database: Database;
  let aliceId: string;
  let aliceToken: string;
  let adminToken: string;
  let cookieName: string;
  let stateCookieName: string;
  let workerBearer: string;
  let plantId: string;
  let diagnosePlantId: string;
  let feedToken: string;
  let identificationJobId: string;
  let diagnosisJobId: string;
  let pairing: { code: string; secret: string };
  let counter = 0;
  let reportId: string;
  let suggestionId: string;
  let journalEntryId: string;
  let wateringEventId: string;
  let throwawayPlantId: string;
  let throwawayTokenId: string;
  let jobId: string;
  let carolEmail = '';
  let stagedEmail = '';

  // A client address of its own per call: the per-IP throttle is no budget under test.
  const clientIp = (): string => {
    counter += 1;
    return `10.${(counter >> 16) & 255}.${(counter >> 8) & 255}.${counter & 255}`;
  };

  const rest = async (
    method: 'GET' | 'POST',
    url: string,
    options: {
      payload?: Record<string, unknown> | Buffer;
      headers?: Record<string, string>;
      status?: number;
    } = {},
  ): Promise<void> => {
    const response = await app.inject({
      method,
      url,
      payload: options.payload,
      headers: { 'x-forwarded-for': clientIp(), ...options.headers },
    });
    const message = `${method} ${url} ${response.body}`;
    if (options.status === undefined) {
      expect(response.statusCode, message).toBeLessThan(300);
    } else {
      expect(response.statusCode, message).toBe(options.status);
    }
  };

  const gql = async <T = unknown>(
    token: string,
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<T> => {
    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      headers: { cookie: `${cookieName}=${token}` },
      payload: { query, variables },
    });
    const body = response.json<{ data?: T; errors?: unknown[] }>();
    expect(body.errors, query).toBeUndefined();
    return body.data as T;
  };

  const session = (token: string): Record<string, string> => ({
    cookie: `${cookieName}=${token}`,
  });

  const startPairing = async (): Promise<{ code: string; secret: string }> => {
    const response = await app.inject({
      method: 'POST',
      url: '/worker/pair/start',
      headers: { 'x-forwarded-for': clientIp() },
      payload: { label: 'budget' },
    });
    return response.json<{ code: string; secret: string }>();
  };

  const stageJob = async (
    kind: 'identify' | 'embed' | 'diagnose',
    status: RecognitionStatus,
  ): Promise<string> =>
    insertedRow(
      await database
        .insert(recognitionJob)
        .values({
          userId: aliceId,
          kind,
          status,
          imageKey: kind === 'embed' ? null : 'img-key',
          plantId: kind === 'diagnose' ? diagnosePlantId : null,
          inputText: kind === 'embed' ? 'monstera' : null,
        })
        .returning({ id: recognitionJob.id }),
    ).id;

  // The worker is "online" once it has been seen: any authenticated call does it.
  const showWorker = async (): Promise<void> => {
    await app.inject({
      method: 'POST',
      url: `/worker/jobs/${crypto.randomUUID()}/failed`,
      headers: { authorization: `Bearer ${workerBearer}` },
    });
  };

  const worker = (): Record<string, string> => ({
    authorization: `Bearer ${workerBearer}`,
  });

  const stageProcessing =
    (kind: 'identify' | 'embed' | 'diagnose') => async (): Promise<void> => {
      jobId = await stageJob(kind, RecognitionStatus.PROCESSING);
    };

  const stagePlant = async (): Promise<string> =>
    (
      await gql<{ createPlant: { id: string } }>(
        aliceToken,
        'mutation ($input: CreatePlantInput!) { createPlant(input: $input) { id } }',
        { input: { name: 'Staged', species: 'Ficus lyrata' } },
      )
    ).createPlant.id;

  beforeAll(async () => {
    const booted = await bootTestApp([
      { provide: AiService, useValue: new AiStub() },
      { provide: TaxonomyService, useValue: new TaxonomyStub() },
      { provide: FileStorageService, useValue: storage },
      { provide: IdentificationService, useValue: new VisionStub() },
      { provide: MailService, useValue: mail },
      { provide: GoogleOAuth, useValue: new GoogleStub() },
    ]);
    app = booted.app;
    database = booted.database;
    await database.delete(recognitionJob);
    await database.delete(plant);
    await database.delete(user);
    const alice = await insertTestUser(database, 'alice');
    const admin = await insertTestUser(database, 'admin');
    expect(ADMIN_EMAIL).toBe('admin@test.dev');
    aliceId = alice.id;
    const jwt = app.get(JwtService);
    aliceToken = await jwt.signAsync({ sub: alice.id });
    adminToken = await jwt.signAsync({ sub: admin.id });
    cookieName = app.get(SessionCookie).token;
    stateCookieName = app.get(SessionCookie).state;

    // A collection of the size the budgets are meant for: 30 plants, 60 waterings each.
    await database.execute(
      sql`
      insert into plant (id, user_id, name, species, watering_interval_summer_days, watering_interval_winter_days)
      select gen_random_uuid(), ${aliceId}, 'plant' || n, 'Ficus lyrata', 3, 3
      from generate_series(1, 30) n`,
    );
    const first = (
      await database.select({ id: plant.id }).from(plant).limit(1)
    )[0];
    plantId = first?.id ?? '';
    await database.execute(
      sql`
      insert into watering_event (id, plant_id, user_id, watered_on)
      select gen_random_uuid(), p.id, p.user_id, current_date - 30 - d
      from plant p cross join generate_series(0, 59) d`,
    );
    diagnosePlantId = insertedRow(
      await database
        .insert(plant)
        .values({
          userId: aliceId,
          name: 'Fern',
          species: 'Nephrolepis exaltata',
          imageKey: 'plant-photo',
        })
        .returning({ id: plant.id }),
    ).id;

    feedToken = (
      await gql<{ calendarFeedToken: string }>(
        aliceToken,
        'query { calendarFeedToken }',
      )
    ).calendarFeedToken;
    workerBearer = (
      await gql<{ createWorkerToken: { token: string } }>(
        aliceToken,
        'mutation { createWorkerToken(label: "stub") { token } }',
      )
    ).createWorkerToken.token;
    await showWorker();
    identificationJobId = await stageJob('identify', RecognitionStatus.DONE);
    diagnosisJobId = await stageJob('diagnose', RecognitionStatus.DONE);
    pairing = await startPairing();
    reportId = (
      await gql<{ reportBug: { id: string } }>(
        aliceToken,
        'mutation ($input: ReportBugInput!) { reportBug(input: $input) { id } }',
        {
          input: { message: 'staged', severity: 'ANNOYING', context: CONTEXT },
        },
      )
    ).reportBug.id;
    suggestionId = (
      await gql<{ requestImprovement: { id: string } }>(
        aliceToken,
        'mutation ($input: RequestImprovementInput!) { requestImprovement(input: $input) { id } }',
        {
          input: {
            message: 'staged',
            importance: 'NICE_TO_HAVE',
            context: CONTEXT,
          },
        },
      )
    ).requestImprovement.id;

    // A verified account with a password, for the sign-in routes.
    carolEmail = 'carol@perf.test';
    await rest('POST', '/auth/register', {
      payload: { email: carolEmail, password: PASSWORD, name: 'Carol' },
    });
    await app.get(BackgroundTasks).idle();
    await rest('POST', '/auth/verify-email', {
      payload: { token: mail.lastTokenFor(carolEmail) },
    });
  }, SETUP_TIMEOUT_MS);

  afterAll(async () => {
    await database.delete(recognitionJob);
    await database.delete(plant);
    await database.delete(user);
    await app.close();
  });

  const read = (
    name: string,
    query: string,
    variables: () => Record<string, unknown> = () => ({}),
    token: () => string = () => aliceToken,
  ): Operation => ({
    name: `Query.${name}`,
    kind: 'read',
    call: async () => {
      await gql(token(), query, variables());
    },
  });

  const mutate = (
    name: string,
    query: string,
    variables: () => Record<string, unknown>,
    prepare?: () => Promise<void>,
    token: () => string = () => aliceToken,
  ): Operation => ({
    name: `Mutation.${name}`,
    kind: 'mutation',
    prepare,
    call: async () => {
      await gql(token(), query, variables());
    },
  });

  const route = (
    method: 'GET' | 'POST',
    path: string,
    url: () => string,
    options: () => Parameters<typeof rest>[2] = () => ({}),
    prepare?: () => Promise<void>,
  ): Operation => ({
    name: `${method} ${path}`,
    kind: method === 'GET' ? 'read' : 'mutation',
    prepare,
    call: () => rest(method, url(), options()),
  });

  const inputOf =
    (value: () => Record<string, unknown>): (() => Record<string, unknown>) =>
    () => ({ input: value() });
  const idOf =
    (key: () => string): (() => Record<string, unknown>) =>
    () => ({ id: key() });

  const operations: Operation[] = [
    // Queries.
    read('aiWorkerOnline', 'query { aiWorkerOnline }'),
    read('amIAdmin', 'query { amIAdmin }'),
    read(
      'bugReports',
      'query { bugReports { id message } }',
      undefined,
      () => adminToken,
    ),
    read('calendarFeedToken', 'query { calendarFeedToken }'),
    read(
      'careSchedules',
      'query ($plantId: ID!) { careSchedules(plantId: $plantId) { id careType } }',
      () => ({ plantId }),
    ),
    read(
      'diagnosisJob',
      'query ($id: ID!) { diagnosisJob(id: $id) { id status } }',
      idOf(() => diagnosisJobId),
    ),
    read('googleEnabled', 'query { googleEnabled }'),
    read(
      'identificationJob',
      'query ($id: ID!) { identificationJob(id: $id) { id status species } }',
      idOf(() => identificationJobId),
    ),
    read(
      'improvementRequests',
      'query { improvementRequests { id message } }',
      undefined,
      () => adminToken,
    ),
    read(
      'journalEntries',
      'query ($plantId: ID!) { journalEntries(plantId: $plantId) { id kind } }',
      () => ({ plantId }),
    ),
    read('me', 'query { me { id email name hasPlantnetKey } }'),
    read(
      'pendingPairing',
      'query ($code: String!) { pendingPairing(code: $code) { code label } }',
      () => ({ code: pairing.code }),
    ),
    read(
      'plant',
      'query ($id: ID!) { plant(id: $id) { id name lastWateredOn nextDueOn wateringHistory { id } } }',
      idOf(() => plantId),
    ),
    read(
      'plantFacets',
      'query { plantFacets { withImage withoutImage genera { genus } } }',
    ),
    read(
      'plants',
      'query { plants(limit: 12, offset: 0) { items { id name lastWateredOn nextDueOn } total } }',
    ),
    read('plantsDue', 'query { plantsDue { id name nextDueOn } }'),
    read(
      'speciesAdvice',
      'query { speciesAdvice(species: "Monstera deliciosa", lang: "fr") { safety { level } watering { summerDays } } }',
    ),
    read(
      'speciesSuggestions',
      'query { speciesSuggestions(search: "monstera") { name } }',
    ),
    read(
      'suggestPlantName',
      'query { suggestPlantName(species: "Monstera deliciosa", lang: "fr") }',
    ),
    read(
      'wateringDefault',
      'query { wateringDefault(species: "Monstera deliciosa") { summerDays winterDays } }',
    ),
    read(
      'wateringEvents',
      'query { wateringEvents(from: "2020-01-01", to: "2030-12-31") { id plantName wateredOn } }',
    ),
    read('webPushPublicKey', 'query { webPushPublicKey }'),
    read('workerTokens', 'query { workerTokens { id label online } }'),

    // Mutations.
    mutate(
      'addJournalEntry',
      'mutation ($input: AddJournalEntryInput!) { addJournalEntry(input: $input) { id } }',
      inputOf(() => ({ plantId, kind: 'NOTE', note: 'budget' })),
    ),
    mutate(
      'approvePairing',
      'mutation ($code: String!) { approvePairing(code: $code) }',
      () => ({ code: pairing.code }),
      async () => {
        pairing = await startPairing();
      },
    ),
    mutate(
      'blockReporter',
      'mutation ($input: BlockReporterInput!) { blockReporter(input: $input) }',
      () => ({ input: { reportId, blocked: counter % 2 === 0 } }),
      async () => {
        counter += 1;
      },
      () => adminToken,
    ),
    mutate(
      'createPlant',
      'mutation ($input: CreatePlantInput!) { createPlant(input: $input) { id } }',
      inputOf(() => ({ name: 'Budget', species: 'Ficus lyrata' })),
    ),
    mutate(
      'createWorkerToken',
      'mutation { createWorkerToken(label: "budget") { id token } }',
      () => ({}),
    ),
    mutate(
      'deleteJournalEntry',
      'mutation ($id: ID!) { deleteJournalEntry(id: $id) }',
      idOf(() => journalEntryId),
      async () => {
        journalEntryId = (
          await gql<{ addJournalEntry: { id: string } }>(
            aliceToken,
            'mutation ($input: AddJournalEntryInput!) { addJournalEntry(input: $input) { id } }',
            { input: { plantId, kind: 'NOTE', note: 'to delete' } },
          )
        ).addJournalEntry.id;
      },
    ),
    mutate(
      'deletePlant',
      'mutation ($id: ID!) { deletePlant(id: $id) }',
      idOf(() => throwawayPlantId),
      async () => {
        throwawayPlantId = await stagePlant();
      },
    ),
    mutate(
      'deleteWateringEvent',
      'mutation ($id: ID!) { deleteWateringEvent(id: $id) }',
      idOf(() => wateringEventId),
      async () => {
        counter += 1;
        wateringEventId = insertedRow(
          await database
            .insert(wateringEvent)
            .values({
              plantId,
              userId: aliceId,
              wateredOn: new Date(Date.UTC(2019, 0, 1) + counter * 86_400_000)
                .toISOString()
                .slice(0, 10),
            })
            .returning({ id: wateringEvent.id }),
        ).id;
      },
    ),
    mutate(
      'denyPairing',
      'mutation ($code: String!) { denyPairing(code: $code) }',
      () => ({ code: pairing.code }),
      async () => {
        pairing = await startPairing();
      },
    ),
    mutate(
      'diagnosePlant',
      'mutation ($plantId: ID!) { diagnosePlant(plantId: $plantId) { id status } }',
      () => ({ plantId: diagnosePlantId }),
    ),
    mutate(
      'logCare',
      'mutation ($input: LogCareInput!) { logCare(input: $input) { id } }',
      inputOf(() => ({ careType: 'ROTATING', plantId })),
    ),
    mutate(
      'regenerateCalendarFeedToken',
      'mutation { regenerateCalendarFeedToken }',
      () => ({}),
    ),
    mutate(
      'removeCareSchedule',
      'mutation ($input: RemoveCareScheduleInput!) { removeCareSchedule(input: $input) }',
      inputOf(() => ({ careType: 'MISTING', plantId })),
      async () => {
        await gql(
          aliceToken,
          'mutation ($input: SetCareScheduleInput!) { setCareSchedule(input: $input) { id } }',
          { input: { careType: 'MISTING', intervalDays: 7, plantId } },
        );
      },
    ),
    mutate(
      'reportBug',
      'mutation ($input: ReportBugInput!) { reportBug(input: $input) { id } }',
      inputOf(() => ({
        message: 'budget',
        severity: 'ANNOYING',
        context: CONTEXT,
      })),
    ),
    mutate(
      'requestImprovement',
      'mutation ($input: RequestImprovementInput!) { requestImprovement(input: $input) { id } }',
      inputOf(() => ({
        message: 'budget',
        importance: 'NICE_TO_HAVE',
        context: CONTEXT,
      })),
    ),
    mutate(
      'revokeWorkerToken',
      'mutation ($id: ID!) { revokeWorkerToken(id: $id) }',
      idOf(() => throwawayTokenId),
      async () => {
        throwawayTokenId = (
          await gql<{ createWorkerToken: { id: string } }>(
            aliceToken,
            'mutation { createWorkerToken(label: "throwaway") { id } }',
          )
        ).createWorkerToken.id;
      },
    ),
    mutate(
      'setBugStatus',
      'mutation ($input: BugStatusInput!) { setBugStatus(input: $input) { id status } }',
      () => ({
        input: { id: reportId, status: counter % 2 === 0 ? 'FIXED' : 'NEW' },
      }),
      async () => {
        counter += 1;
      },
      () => adminToken,
    ),
    mutate(
      'setCareSchedule',
      'mutation ($input: SetCareScheduleInput!) { setCareSchedule(input: $input) { id } }',
      inputOf(() => ({ careType: 'FERTILIZING', intervalDays: 30, plantId })),
    ),
    mutate(
      'setImprovementStatus',
      'mutation ($input: ImprovementStatusInput!) { setImprovementStatus(input: $input) { id status } }',
      () => ({
        input: {
          id: suggestionId,
          status: counter % 2 === 0 ? 'PLANNED' : 'NEW',
        },
      }),
      async () => {
        counter += 1;
      },
      () => adminToken,
    ),
    mutate(
      'setPlantnetApiKey',
      'mutation ($key: String) { setPlantnetApiKey(key: $key) }',
      () => ({ key: null }),
    ),
    mutate(
      'subscribeToPush',
      'mutation ($input: PushSubscriptionInput!) { subscribeToPush(input: $input) }',
      inputOf(() => ({
        endpoint: 'https://push.example.test/budget',
        p256dh: 'p256dh-key',
        auth: 'auth-key',
      })),
    ),
    mutate(
      'unsubscribeFromPush',
      'mutation ($endpoint: String!) { unsubscribeFromPush(endpoint: $endpoint) }',
      () => ({ endpoint: 'https://push.example.test/budget' }),
    ),
    mutate(
      'updatePlant',
      'mutation ($input: UpdatePlantInput!) { updatePlant(input: $input) { id } }',
      inputOf(() => ({
        id: plantId,
        name: 'Renamed',
        species: 'Ficus lyrata',
      })),
    ),
    mutate(
      'waterPlant',
      'mutation ($input: WaterPlantInput!) { waterPlant(input: $input) { id lastWateredOn } }',
      inputOf(() => ({
        plantId,
        // A day of its own each time: watering twice on one day is a no-op.
        wateredOn: new Date(Date.UTC(2018, 0, 1) + (counter += 1) * 86_400_000)
          .toISOString()
          .slice(0, 10),
      })),
    ),

    // REST routes.
    route('GET', '/health', () => '/health'),
    route('GET', '/health/ready', () => '/health/ready'),
    route('GET', '/calendar-feed/:token', () => `/calendar-feed/${feedToken}`),
    route('GET', '/images/:key', () => `/images/${crypto.randomUUID()}`),
    route(
      'POST',
      '/auth/register',
      () => '/auth/register',
      () => ({
        payload: {
          email: `new${(counter += 1)}@perf.test`,
          password: PASSWORD,
          name: 'New',
        },
      }),
    ),
    route(
      'POST',
      '/auth/login',
      () => '/auth/login',
      () => ({ payload: { email: carolEmail, password: PASSWORD } }),
    ),
    route(
      'POST',
      '/auth/logout',
      () => '/auth/logout',
      () => ({}),
    ),
    route(
      'POST',
      '/auth/verify-email',
      () => '/auth/verify-email',
      () => ({
        payload: { token: mail.lastTokenFor(stagedEmail) },
      }),
      async () => {
        stagedEmail = `staged${(counter += 1)}@perf.test`;
        await rest('POST', '/auth/register', {
          payload: {
            email: stagedEmail,
            password: PASSWORD,
            name: 'Staged',
          },
        });
        await app.get(BackgroundTasks).idle();
      },
    ),
    route(
      'POST',
      '/auth/resend-verification',
      () => '/auth/resend-verification',
      () => ({ payload: { email: stagedEmail } }),
    ),
    route(
      'POST',
      '/auth/forgot-password',
      () => '/auth/forgot-password',
      () => ({ payload: { email: carolEmail } }),
    ),
    route(
      'POST',
      '/auth/reset-password',
      () => '/auth/reset-password',
      () => ({
        payload: { token: mail.lastTokenFor(carolEmail), password: PASSWORD },
      }),
      async () => {
        await rest('POST', '/auth/forgot-password', {
          payload: { email: carolEmail },
        });
        await app.get(BackgroundTasks).idle();
      },
    ),
    route(
      'GET',
      '/auth/google',
      () => '/auth/google',
      () => ({ status: 302 }),
    ),
    route(
      'GET',
      '/auth/google/callback',
      () => '/auth/google/callback?code=budget&state=budget',
      () => ({ headers: { cookie: `${stateCookieName}=budget` }, status: 302 }),
    ),
    route(
      'POST',
      '/worker/pair/start',
      () => '/worker/pair/start',
      () => ({
        payload: { label: 'budget' },
      }),
    ),
    route(
      'POST',
      '/worker/pair/poll',
      () => '/worker/pair/poll',
      () => ({
        payload: { secret: pairing.secret },
      }),
    ),
    route(
      'GET',
      '/worker/next-job',
      () => '/worker/next-job',
      () => ({
        headers: worker(),
      }),
      async () => {
        await stageJob('identify', RecognitionStatus.PENDING);
      },
    ),
    route(
      'POST',
      '/worker/jobs/:id/result',
      () => `/worker/jobs/${jobId}/result`,
      () => ({ headers: worker(), payload: { species: 'Monstera deliciosa' } }),
      stageProcessing('identify'),
    ),
    route(
      'POST',
      '/worker/jobs/:id/diagnosis',
      () => `/worker/jobs/${jobId}/diagnosis`,
      () => ({
        headers: worker(),
        payload: { diagnosis: 'Water less.' },
      }),
      stageProcessing('diagnose'),
    ),
    route(
      'POST',
      '/worker/jobs/:id/embedding',
      () => `/worker/jobs/${jobId}/embedding`,
      () => ({
        headers: worker(),
        payload: { embedding: [0.1, 0.2, 0.3] },
      }),
      stageProcessing('embed'),
    ),
    route(
      'POST',
      '/worker/jobs/:id/failed',
      () => `/worker/jobs/${jobId}/failed`,
      () => ({ headers: worker() }),
      stageProcessing('identify'),
    ),
    route(
      'POST',
      '/worker/jobs/:id/diagnosis-failed',
      () => `/worker/jobs/${jobId}/diagnosis-failed`,
      () => ({ headers: worker() }),
      stageProcessing('diagnose'),
    ),
    route(
      'POST',
      '/uploads/request-identification',
      () => '/uploads/request-identification?mode=local',
      () => ({
        headers: {
          ...session(aliceToken),
          'content-type': `multipart/form-data; boundary=${BOUNDARY}`,
        },
        payload: multipart('image/jpeg'),
      }),
      showWorker,
    ),
    ...['identify-plant', 'plant-image', 'bug-image'].map((path) =>
      route(
        'POST',
        `/uploads/${path}`,
        () => `/uploads/${path}`,
        () => ({
          headers: {
            ...session(aliceToken),
            'content-type': `multipart/form-data; boundary=${BOUNDARY}`,
          },
          payload: multipart('image/jpeg'),
        }),
      ),
    ),
  ];

  describe('coverage', () => {
    it('has an entry for every GraphQL query and mutation of the schema', () => {
      const covered = operations
        .filter((operation) => /^(Query|Mutation)\./.test(operation.name))
        .map((operation) => operation.name)
        .sort();
      expect(covered).toEqual(declaredOperations().sort());
    });

    it('has an entry for every REST route of the controllers', () => {
      const covered = operations
        .filter((operation) => /^(GET|POST) /.test(operation.name))
        .map((operation) => operation.name)
        .sort();
      expect(covered).toEqual(declaredRoutes().sort());
    });
  });

  it.each(operations.map((operation) => [operation.name, operation] as const))(
    '%s answers within its budget (median of the samples)',
    async (name, operation) => {
      const median = await medianDurationMs(
        () => operation.call(),
        undefined,
        operation.prepare,
      );
      console.info(
        `[budget] ${name}: median ${median.toFixed(1)} ms (budget ${BUDGET_MS[operation.kind]} ms)`,
      );
      expect(median).toBeLessThan(BUDGET_MS[operation.kind]);
    },
    TEST_TIMEOUT_MS,
  );
});
