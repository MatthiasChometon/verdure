import fastifyCookie from '@fastify/cookie';
import { ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { expect } from 'vitest';
import { AppModule } from '../../app.module';
import { AiService } from '../../infrastructure/ai/service';
import {
  DATABASE,
  type Database,
} from '../../infrastructure/database/token';
import { FileStorageService } from '../../infrastructure/file-storage/service';
import { TaxonomyService } from '../../infrastructure/taxonomy/service';
import { SessionCookie } from '../auth/currentUser/cookie';
import { AiStub } from '../plant/ai.stub';
import { user } from '../user/schema';
import { recognitionJob } from './job/schema';
import { workerPairing } from './pairing/schema';
import { workerToken } from './token/schema';

export type GraphqlBody<T> = { data?: T; errors?: unknown[] };
type InjectResponse = Awaited<ReturnType<NestFastifyApplication['inject']>>;

// In-memory object store: returns fixed bytes and records removals so tests can
// assert the image is cleaned up once a job is terminal.
export class FileStorageStub {
  readonly removed: string[] = [];

  upload(): Promise<string> {
    return Promise.resolve('stub-image-key');
  }

  read(): Promise<{ body: Uint8Array; contentType: string }> {
    return Promise.resolve({
      body: new Uint8Array([1, 2, 3]),
      contentType: 'image/jpeg',
    });
  }

  remove(key: string): Promise<void> {
    this.removed.push(key);
    return Promise.resolve();
  }
}

// A fixed GBIF suggestion so species reconciliation is deterministic offline.
class TaxonomyStub {
  suggest(): Promise<{ key: number; name: string }[]> {
    return Promise.resolve([{ key: 1, name: 'Dionaea muscipula' }]);
  }
}

// Boots the app against the test database with the network-touching services
// stubbed, and exposes GraphQL + worker-channel helpers so the e2e stays short.
export class AiWorkerTestHarness {
  private app!: NestFastifyApplication;
  database!: Database;
  readonly storage = new FileStorageStub();
  aliceToken!: string;
  bobToken!: string;
  aliceId!: string;
  bobId!: string;

  async init(): Promise<void> {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AiService)
      .useValue(new AiStub())
      .overrideProvider(TaxonomyService)
      .useValue(new TaxonomyStub())
      .overrideProvider(FileStorageService)
      .useValue(this.storage)
      .compile();

    this.app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    this.app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await this.app.register(fastifyCookie);
    await this.app.init();
    await this.app.getHttpAdapter().getInstance().ready();

    this.database = this.app.get<Database>(DATABASE);
    await migrate(this.database, {
      migrationsFolder: 'infrastructure/database/migrations',
    });

    await this.reset();
    await this.database.delete(user);
    const [alice] = await this.database
      .insert(user)
      .values({
        googleId: 'google-alice',
        email: 'alice@test.dev',
        name: 'Alice',
        avatarUrl: null,
      })
      .returning();
    const [bob] = await this.database
      .insert(user)
      .values({
        googleId: 'google-bob',
        email: 'bob@test.dev',
        name: 'Bob',
        avatarUrl: null,
      })
      .returning();
    this.aliceId = alice.id;
    this.bobId = bob.id;

    const jwt = this.app.get(JwtService);
    this.aliceToken = await jwt.signAsync({ sub: alice.id });
    this.bobToken = await jwt.signAsync({ sub: bob.id });
  }

  async reset(): Promise<void> {
    await this.database.delete(recognitionJob);
    await this.database.delete(workerPairing);
    await this.database.delete(workerToken);
    this.storage.removed.length = 0;
  }

  async close(): Promise<void> {
    await this.reset();
    await this.database.delete(user);
    await this.app.close();
  }

  async graphql<T>(
    query: string,
    token: string,
    variables?: Record<string, unknown>,
  ): Promise<T> {
    const response = await this.app.inject({
      method: 'POST',
      url: '/graphql',
      headers: { cookie: `${this.app.get(SessionCookie).token}=${token}` },
      payload: { query, variables },
    });
    const body = response.json<GraphqlBody<T>>();
    expect(body.errors).toBeUndefined();
    return body.data as T;
  }

  // A worker request, authenticated by its bearer token.
  worker(
    method: 'GET' | 'POST',
    path: string,
    bearer: string,
    body?: Record<string, unknown>,
  ): Promise<InjectResponse> {
    return this.app.inject({
      method,
      url: path,
      headers: { authorization: `Bearer ${bearer}` },
      payload: body,
    });
  }

  // Enqueue a job straight into the queue. The REST upload path is exercised
  // for real in the worker end-to-end test.
  async enqueue(userId: string, imageKey = 'img-key'): Promise<string> {
    const [row] = await this.database
      .insert(recognitionJob)
      .values({ userId, imageKey })
      .returning({ id: recognitionJob.id });
    return row.id;
  }
}
