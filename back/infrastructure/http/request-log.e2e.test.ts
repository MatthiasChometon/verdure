import { Logger } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { bootTestApp } from '../testing/test-app';

let app: NestFastifyApplication;

beforeAll(async (): Promise<void> => {
  ({ app } = await bootTestApp());
});

afterAll(() => app.close());

afterEach(() => {
  vi.restoreAllMocks();
});

const linesOf = (spy: { mock: { calls: unknown[][] } }): string[] =>
  spy.mock.calls.map(([line]): string => String(line));

describe('the request log of the running app', () => {
  it('logs a REST request with its route, status and duration', async () => {
    const log = vi.spyOn(Logger.prototype, 'log');

    await app.inject({ method: 'GET', url: '/health' });

    expect(linesOf(log)).toContainEqual(
      expect.stringMatching(/^GET \/health 200 \d+ms$/),
    );
  });

  it('logs a request a guard refuses, with its route pattern and never its URL', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn');

    await app.inject({
      method: 'GET',
      url: `/calendar-feed/${'a'.repeat(64)}-secret?token=query-secret`,
    });

    const lines = linesOf(warn);
    expect(lines).toContainEqual(
      expect.stringMatching(/^GET \/calendar-feed\/:token 400 \d+ms$/),
    );
    expect(lines.join(' ')).not.toMatch(/-secret|query-secret/);
  });

  it('logs a GraphQL operation by name, without the query text', async () => {
    const log = vi.spyOn(Logger.prototype, 'log');

    await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: { query: 'query { googleEnabled }' },
    });

    expect(linesOf(log)).toContainEqual(
      expect.stringMatching(/^Query\.googleEnabled 200 \d+ms$/),
    );
  });

  it('logs a guarded GraphQL operation refused without a session once, with its code', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn');

    await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: { query: 'query { plantsDue { id } }' },
    });

    expect(
      linesOf(warn).filter((line) => line.startsWith('Query.plantsDue')),
    ).toEqual(['Query.plantsDue 401 UNAUTHENTICATED']);
  });
});
