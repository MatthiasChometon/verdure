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
import {
  DATABASE,
  type Database,
} from '../../infrastructure/database/token';
import { TaxonomyService } from '../../infrastructure/taxonomy/service';
import { SessionCookie } from '../auth/currentUser/cookie';
import { user } from '../user/schema';
import { GbifStub } from './gbif.stub';
import { species } from './schema';

type InjectResponse = Awaited<ReturnType<NestFastifyApplication['inject']>>;

const SUGGEST_QUERY =
  'query ($search: String!) { speciesSuggestions(search: $search) { name } }';

// Boots the whole app once against the test database with a stubbed GBIF, and
// exposes the suggest helpers so each species e2e file stays short.
export class SpeciesTestHarness {
  private app!: NestFastifyApplication;
  private database!: Database;
  private token!: string;
  readonly gbif = new GbifStub();

  async init(): Promise<void> {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(TaxonomyService)
      .useValue(this.gbif)
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

    await this.database.delete(user);
    const [gardener] = await this.database
      .insert(user)
      .values({
        googleId: 'google-gardener',
        email: 'gardener@test.dev',
        name: 'Gardener',
        avatarUrl: null,
      })
      .returning();
    this.token = await this.app.get(JwtService).signAsync({ sub: gardener.id });
  }

  async reset(): Promise<void> {
    await this.database.delete(species);
    this.gbif.matches = [];
  }

  async close(): Promise<void> {
    await this.database.delete(species);
    await this.database.delete(user);
    await this.app.close();
  }

  async suggest(search: string): Promise<string[]> {
    const response = await this.app.inject({
      method: 'POST',
      url: '/graphql',
      headers: { cookie: `${this.app.get(SessionCookie).token}=${this.token}` },
      payload: { query: SUGGEST_QUERY, variables: { search } },
    });
    expect(response.statusCode).toBe(200);
    const { data } = response.json<{
      data: { speciesSuggestions: { name: string }[] };
    }>();
    return data.speciesSuggestions.map((current) => current.name);
  }

  // Raw request without the auth cookie, for the unauthenticated case.
  suggestUnauthenticated(search: string): Promise<InjectResponse> {
    return this.app.inject({
      method: 'POST',
      url: '/graphql',
      payload: { query: SUGGEST_QUERY, variables: { search } },
    });
  }
}
