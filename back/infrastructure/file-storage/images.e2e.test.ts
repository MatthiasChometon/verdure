import { randomUUID } from 'node:crypto';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bootTestApp } from '../testing/test-app';

describe('image route (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    ({ app } = await bootTestApp());
  });
  afterAll(() => app.close());

  const status = async (key: string): Promise<number> =>
    (await app.inject({ method: 'GET', url: `/images/${key}` })).statusCode;

  it('answers 404 to a well-formed key nobody stored', async () => {
    expect(await status(randomUUID())).toBe(404);
  });

  it.each(['not-a-uuid', '12345', `${randomUUID()}x`, '..%2F..%2Fetc'])(
    'answers 400 to the malformed key %s before reading the storage',
    async (key) => {
      expect(await status(key)).toBe(400);
    },
  );
});
