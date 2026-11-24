import type { Type } from '@nestjs/common';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { type Database } from '../../../infrastructure/database/token';
import { MailService } from '../../../infrastructure/mail/service';
import { bootTestApp } from '../../../infrastructure/testing/test-app';
import { plant } from '../../plant/schema';
import { user } from '../../user/schema';
import { SessionCookie } from '../currentUser/cookie';
import { GoogleOAuth } from '../google/service';
import { GoogleStub } from './google.stub';
import { MailStub } from './mail.stub';
import { authToken } from './schema';

export type InjectResponse = Awaited<
  ReturnType<NestFastifyApplication['inject']>
>;

// Boots the whole app once against the test database with a captured mail
// transport, and exposes REST helpers so each auth e2e file stays short.
export class AuthTestHarness {
  private app!: NestFastifyApplication;
  database!: Database;
  readonly mail = new MailStub();
  readonly google = new GoogleStub();

  async init(): Promise<void> {
    const { app, database } = await bootTestApp([
      { provide: MailService, useValue: this.mail },
      { provide: GoogleOAuth, useValue: this.google },
    ]);
    this.app = app;
    this.database = database;
  }

  // A provider of the running app, to drive a repository directly in the cases
  // HTTP cannot stage (a transaction held open, a write that fails half-way).
  resolve<T>(token: Type<T>): T {
    return this.app.get(token);
  }

  async reset(): Promise<void> {
    this.mail.messages = [];
    this.google.outcome = new GoogleStub().outcome;
    await this.database.delete(plant);
    await this.database.delete(authToken);
    await this.database.delete(user);
  }

  async close(): Promise<void> {
    await this.reset();
    await this.app.close();
  }

  get(
    url: string,
    headers: Record<string, string> = {},
  ): Promise<InjectResponse> {
    return this.app.inject({ method: 'GET', url, headers });
  }

  post(
    url: string,
    payload: Record<string, unknown>,
    headers: Record<string, string> = {},
  ): Promise<InjectResponse> {
    return this.app.inject({ method: 'POST', url, payload, headers });
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
