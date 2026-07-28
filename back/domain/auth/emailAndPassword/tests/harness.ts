import fastifyCookie from '@fastify/cookie';
import { ValidationPipe } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { AppModule } from '../../../../app.module';
import {
  DATABASE,
  type Database,
} from '../../../../infrastructure/database/token';
import { MailService } from '../../../../infrastructure/mail/service';
import { plant } from '../../../plant/schema';
import { user } from '../../../user/schema';
import { SessionCookie } from '../../currentUser/cookie';
import { MailStub } from './mail.stub';
import { authToken } from '../schema';

export type InjectResponse = Awaited<
  ReturnType<NestFastifyApplication['inject']>
>;

// Boots the whole app once against the test database with a captured mail
// transport, and exposes REST helpers so each auth e2e file stays short.
export class AuthTestHarness {
  private app!: NestFastifyApplication;
  private database!: Database;
  readonly mail = new MailStub();

  async init(): Promise<void> {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
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
  }

  async reset(): Promise<void> {
    this.mail.messages = [];
    await this.database.delete(plant);
    await this.database.delete(authToken);
    await this.database.delete(user);
  }

  async close(): Promise<void> {
    await this.reset();
    await this.app.close();
  }

  post(url: string, payload: Record<string, unknown>): Promise<InjectResponse> {
    return this.app.inject({ method: 'POST', url, payload });
  }

  register(
    email: string,
    password: string,
    name: string,
  ): Promise<InjectResponse> {
    return this.post('/auth/register', { email, password, name });
  }

  login(email: string, password: string): Promise<InjectResponse> {
    return this.post('/auth/login', { email, password });
  }

  // Registers then verifies via the emailed token, leaving a usable account.
  async registerVerified(
    email: string,
    password: string,
    name: string,
  ): Promise<void> {
    await this.register(email, password, name);
    await this.post('/auth/verify-email', {
      token: this.mail.lastTokenFor(email),
    });
  }

  sessionToken(response: InjectResponse): string | undefined {
    const name = this.app.get(SessionCookie).token;
    return response.cookies.find((cookie) => cookie.name === name)?.value;
  }
}
