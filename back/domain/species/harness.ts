import type { Type } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { expect } from 'vitest';
import { type Database } from '../../infrastructure/database/token';
import { bootTestApp } from '../../infrastructure/testing/test-app';
import { TaxonomyService } from '../../infrastructure/taxonomy/service';
import { SessionCookie } from '../auth/currentUser/cookie';
import { user } from '../user/schema';
import { insertTestUser } from '../user/test-user';
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
    const { app, database } = await bootTestApp([
      { provide: TaxonomyService, useValue: this.gbif },
    ]);
    this.app = app;
    this.database = database;

    await this.database.delete(user);
    const gardener = await insertTestUser(this.database, 'gardener');
    this.token = await this.app.get(JwtService).signAsync({ sub: gardener.id });
  }

  async reset(): Promise<void> {
    await this.database.delete(species);
    this.gbif.matches = [];
    this.gbif.queries = [];
  }

  // A provider of the running app, for the collaborators that have no endpoint
  // of their own (the reconciler is called by other slices).
  resolve<T>(token: Type<T>): T {
    return this.app.get(token);
  }

  // Puts species into the local index, as the seeder would.
  async seed(...names: string[]): Promise<void> {
    await this.database
      .insert(species)
      .values(names.map((name, index) => ({ gbifKey: index + 1, name })));
  }

  async close(): Promise<void> {
    await this.database.delete(species);
    await this.database.delete(user);
    await this.app.close();
  }

  // The raw answer of an authenticated suggestions query.
  suggestResponse(search: string): Promise<InjectResponse> {
    return this.app.inject({
      method: 'POST',
      url: '/graphql',
      headers: { cookie: `${this.app.get(SessionCookie).token}=${this.token}` },
      payload: { query: SUGGEST_QUERY, variables: { search } },
    });
  }

  async suggest(search: string): Promise<string[]> {
    const response = await this.suggestResponse(search);
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
