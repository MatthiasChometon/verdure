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
import { MailService } from '../../infrastructure/mail/service';
import { SessionCookie } from '../auth/currentUser/cookie';
import { AiStub } from '../plant/ai.stub';
import { user } from '../user/schema';
import { MailStub } from '../auth/emailAndPassword/mail.stub';
import { bugReport, reportBlock } from './schema';

export const ADMIN_EMAIL = 'admin@test.dev';
export const READER_EMAIL = 'reader@test.dev';

// The admin list is read from the environment, so it is set here — before the
// module compiles — rather than through a stub: the test exercises the real
// Admins service, not a stand-in for it.
process.env.ADMIN_EMAILS = ADMIN_EMAIL;

export type GraphqlBody<T> = { data?: T; errors?: unknown[] };

// Boots the whole app once against the test database, records the emails it
// would send, and hands out an admin session and a plain reader session.
export class BugReportTestHarness {
  private app!: NestFastifyApplication;
  database!: Database;
  readonly mail = new MailStub();
  adminToken!: string;
  readerToken!: string;

  async init(): Promise<void> {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AiService)
      .useValue(new AiStub())
      .overrideProvider(MailService)
      .useValue(this.mail)
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
    const [admin] = await this.database
      .insert(user)
      .values({ email: ADMIN_EMAIL, name: 'Admin', avatarUrl: null })
      .returning();
    const [reader] = await this.database
      .insert(user)
      .values({ email: READER_EMAIL, name: 'Reader', avatarUrl: null })
      .returning();

    const jwt = this.app.get(JwtService);
    this.adminToken = await jwt.signAsync({ sub: admin.id });
    this.readerToken = await jwt.signAsync({ sub: reader.id });
  }

  async reset(): Promise<void> {
    await this.database.delete(bugReport);
    await this.database.delete(reportBlock);
    this.mail.messages.length = 0;
  }

  async close(): Promise<void> {
    await this.reset();
    await this.database.delete(user);
    await this.app.close();
  }

  // Raw call: returns the GraphQL body (data + errors). Token optional, for the
  // auth cases that assert on `errors`.
  async request<T>(
    query: string,
    variables?: Record<string, unknown>,
    token?: string,
  ): Promise<GraphqlBody<T>> {
    const headers =
      token === undefined
        ? {}
        : { cookie: `${this.app.get(SessionCookie).token}=${token}` };
    const response = await this.app.inject({
      method: 'POST',
      url: '/graphql',
      headers,
      payload: { query, variables },
    });
    return response.json<GraphqlBody<T>>();
  }

  // Happy-path call: asserts a body with no errors and returns its data.
  async graphql<T>(
    query: string,
    token: string,
    variables?: Record<string, unknown>,
  ): Promise<T> {
    const body = await this.request<T>(query, variables, token);
    expect(body.errors).toBeUndefined();
    return body.data as T;
  }
}
