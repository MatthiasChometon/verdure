import { JwtService } from '@nestjs/jwt';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { expect } from 'vitest';
import { AiService } from '../../infrastructure/ai/service';
import { insertedRow } from '../../infrastructure/database/inserted-row';
import { type Database } from '../../infrastructure/database/token';
import { bootTestApp } from '../../infrastructure/testing/test-app';
import { SessionCookie } from '../auth/currentUser/cookie';
import { user } from '../user/schema';
import { CreatePlantInput } from './save/input';
import { plant } from './schema';
import { AiStub } from './ai.stub';
import { PlantInputBuilder } from './input.builder';

export type GraphqlBody<T> = { data?: T; errors?: unknown[] };

type CreatedPlant = {
  id: string;
  name: string;
  species: string;
  imageUrl: string | null;
  lastWateredOn: string | null;
  nextDueOn: string | null;
};

// Boots the whole app once against the test database and exposes GraphQL helpers
// + factories, so each e2e file stays short. Owned lifecycle: init/reset/close.
export class PlantTestHarness {
  private app!: NestFastifyApplication;
  database!: Database;
  aliceToken!: string;
  bobToken!: string;

  async init(): Promise<void> {
    const { app, database } = await bootTestApp([
      { provide: AiService, useValue: new AiStub() },
    ]);
    this.app = app;
    this.database = database;

    await this.database.delete(plant);
    await this.database.delete(user);
    const alice = await this.insertUser('alice');
    const bob = await this.insertUser('bob');

    const jwt = this.app.get(JwtService);
    this.aliceToken = await jwt.signAsync({ sub: alice.id });
    this.bobToken = await jwt.signAsync({ sub: bob.id });
  }

  private async insertUser(name: string): Promise<{ id: string }> {
    return insertedRow(
      await this.database
        .insert(user)
        .values({
          googleId: `google-${name}`,
          email: `${name}@test.dev`,
          name,
          avatarUrl: null,
        })
        .returning({ id: user.id }),
    );
  }

  async resetPlants(): Promise<void> {
    await this.database.delete(plant);
  }

  async close(): Promise<void> {
    await this.database.delete(plant);
    await this.database.delete(user);
    await this.app.close();
  }

  // Raw call: returns the GraphQL body (data + errors), token optional. For the
  // auth / validation cases that assert on `errors`.
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

  // Happy-path call: asserts a 2xx body with data and returns it.
  async graphql<T>(
    query: string,
    token: string,
    variables?: Record<string, unknown>,
  ): Promise<T> {
    const body = await this.request<T>(query, variables, token);
    expect(body.errors).toBeUndefined();
    return body.data as T;
  }

  create(
    input: CreatePlantInput | PlantInputBuilder,
    token: string,
  ): Promise<{ createPlant: CreatedPlant }> {
    const built = input instanceof PlantInputBuilder ? input.build() : input;
    return this.graphql(
      'mutation ($input: CreatePlantInput!) { createPlant(input: $input) { id name species imageUrl lastWateredOn nextDueOn } }',
      token,
      { input: built },
    );
  }

  createPlant(
    name: string,
    species: string,
    token: string,
  ): Promise<{ createPlant: CreatedPlant }> {
    return this.create(
      new PlantInputBuilder().named(name).ofSpecies(species),
      token,
    );
  }

  water(
    plantId: string,
    wateredOn: string,
    token: string,
  ): Promise<{
    waterPlant: { lastWateredOn: string | null; nextDueOn: string | null };
  }> {
    return this.graphql(
      'mutation ($input: WaterPlantInput!) { waterPlant(input: $input) { lastWateredOn nextDueOn } }',
      token,
      { input: { plantId, wateredOn } },
    );
  }
}
