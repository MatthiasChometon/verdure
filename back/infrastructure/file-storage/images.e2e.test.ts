import { randomUUID } from 'node:crypto';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { samplePhoto as photo } from '../testing/sample-photo';
import { bootTestApp } from '../testing/test-app';
import { variantKey } from './image-variants';
import { FileStorageService } from './service';

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

  describe('resized variants', () => {
    it('serves a card copy under 60 KB as WebP, made once and kept in the storage', async () => {
      const storage = app.get(FileStorageService);
      const original = await photo();
      const key = await storage.upload(original, 'image/jpeg');

      const response = await app.inject({
        method: 'GET',
        url: `/images/${key}?w=480`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('image/webp');
      expect(response.rawPayload.length).toBeLessThanOrEqual(60 * 1024);
      expect(response.rawPayload.length).toBeLessThan(original.length / 10);
      expect((await sharp(response.rawPayload).metadata()).width).toBe(480);
      // Stored under its derived key, so the next request does not resize again.
      const stored = await storage.read(variantKey(key, 480));
      expect(stored.body.length).toBe(response.rawPayload.length);
    });

    it('serves the original unchanged without a width', async () => {
      const storage = app.get(FileStorageService);
      const original = await photo();
      const key = await storage.upload(original, 'image/jpeg');

      const response = await app.inject({
        method: 'GET',
        url: `/images/${key}`,
      });

      expect(response.headers['content-type']).toBe('image/jpeg');
      expect(response.rawPayload.length).toBe(original.length);
    });

    it('removes the variants with the original', async () => {
      const storage = app.get(FileStorageService);
      const key = await storage.upload(await photo(), 'image/jpeg');
      await app.inject({ method: 'GET', url: `/images/${key}?w=960` });

      await storage.remove(key);

      await expect(storage.read(variantKey(key, 960))).rejects.toThrow();
    });

    it('answers 400 to a width that is not offered and 404 to an unknown key', async () => {
      const storage = app.get(FileStorageService);
      const key = await storage.upload(await photo(), 'image/jpeg');

      expect(await status(`${key}?w=500`)).toBe(400);
      expect(await status(`${randomUUID()}?w=480`)).toBe(404);
    });
  });
});
