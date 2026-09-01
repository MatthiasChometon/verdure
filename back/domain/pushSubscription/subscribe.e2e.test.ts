import fastifyCookie from '@fastify/cookie';
import { ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../../app.module';
import { AiService } from '../../infrastructure/ai/service';
import { WebPushService } from '../../infrastructure/push/service';
import { DATABASE, type Database } from '../../infrastructure/database/token';
import { AiStub } from '../plant/ai.stub';
import { SessionCookie } from '../auth/currentUser/cookie';
import { user } from '../user/schema';
import { pushSubscription } from './schema';
import { WebPushStub } from './web-push.stub';

type GraphqlBody<T> = { data?: T; errors?: unknown[] };

const SUBSCRIBE = `
  mutation ($input: PushSubscriptionInput!) {
    subscribeToPush(input: $input)
  }`;
const UNSUBSCRIBE = `
  mutation ($endpoint: String!) {
    unsubscribeFromPush(endpoint: $endpoint)
  }`;

describe('push subscription (e2e)', () => {
  let app: NestFastifyApplication;
  let database: Database;
  let cookieName: string;
  let aliceToken: string;
  let bobToken: string;

  const request = async <T>(
    query: string,
    variables?: Record<string, unknown>,
    token?: string,
  ): Promise<GraphqlBody<T>> => {
    const headers =
      token === undefined ? {} : { cookie: `${cookieName}=${token}` };
    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      headers,
      payload: { query, variables },
    });
    return response.json<GraphqlBody<T>>();
  };

  const subscription = (endpoint: string): Record<string, unknown> => ({
    endpoint,
    p256dh: 'p256dh-key',
    auth: 'auth-secret',
  });

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AiService)
      .useValue(new AiStub())
      .overrideProvider(WebPushService)
      .useValue(new WebPushStub())
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.register(fastifyCookie);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    database = app.get<Database>(DATABASE);
    await migrate(database, {
      migrationsFolder: 'infrastructure/database/migrations',
    });
    cookieName = app.get(SessionCookie).token;

    await database.delete(pushSubscription);
    await database.delete(user);
    const [alice] = await database
      .insert(user)
      .values({ email: 'alice@test.dev', name: 'Alice' })
      .returning();
    const [bob] = await database
      .insert(user)
      .values({ email: 'bob@test.dev', name: 'Bob' })
      .returning();
    const jwt = app.get(JwtService);
    aliceToken = await jwt.signAsync({ sub: alice.id });
    bobToken = await jwt.signAsync({ sub: bob.id });
  });

  beforeEach(async () => {
    await database.delete(pushSubscription);
  });

  afterAll(async () => {
    await database.delete(pushSubscription);
    await database.delete(user);
    await app.close();
  });

  it('exposes the VAPID public key without authentication', async () => {
    const body = await request<{ webPushPublicKey: string | null }>(
      'query { webPushPublicKey }',
    );
    expect(body.errors).toBeUndefined();
    expect(body.data?.webPushPublicKey).toBe('test-vapid-public-key');
  });

  it('rejects an unauthenticated subscribe', async () => {
    const body = await request(SUBSCRIBE, {
      input: subscription('https://push.example/anon'),
    });
    expect(body.errors).toBeDefined();
  });

  it('stores a subscription for the signed-in user', async () => {
    const body = await request<{ subscribeToPush: boolean }>(
      SUBSCRIBE,
      { input: subscription('https://push.example/alice') },
      aliceToken,
    );
    expect(body.errors).toBeUndefined();
    expect(body.data?.subscribeToPush).toBe(true);

    const rows = await database
      .select()
      .from(pushSubscription)
      .where(eq(pushSubscription.endpoint, 'https://push.example/alice'));
    expect(rows).toHaveLength(1);
  });

  it('is idempotent on the endpoint (re-subscribing updates, not duplicates)', async () => {
    await request(
      SUBSCRIBE,
      { input: subscription('https://push.example/dup') },
      aliceToken,
    );
    await request(
      SUBSCRIBE,
      { input: subscription('https://push.example/dup') },
      aliceToken,
    );
    const rows = await database.select().from(pushSubscription);
    expect(rows).toHaveLength(1);
  });

  it('lets a user remove only their own subscription', async () => {
    const endpoint = 'https://push.example/aliceonly';
    await request(SUBSCRIBE, { input: subscription(endpoint) }, aliceToken);

    // Bob cannot remove Alice's subscription.
    const bobAttempt = await request<{ unsubscribeFromPush: boolean }>(
      UNSUBSCRIBE,
      { endpoint },
      bobToken,
    );
    expect(bobAttempt.data?.unsubscribeFromPush).toBe(false);
    expect(await database.select().from(pushSubscription)).toHaveLength(1);

    // Alice can.
    const aliceAttempt = await request<{ unsubscribeFromPush: boolean }>(
      UNSUBSCRIBE,
      { endpoint },
      aliceToken,
    );
    expect(aliceAttempt.data?.unsubscribeFromPush).toBe(true);
    expect(await database.select().from(pushSubscription)).toHaveLength(0);
  });
});
