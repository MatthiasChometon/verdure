import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { samplePhoto } from '../testing/sample-photo';
import { DiskFileStorage } from './disk.storage';
import { variantKey } from './image-variants';
import { ImageVariants } from './image-variants.service';

describe('ImageVariants', () => {
  let directory: string;
  let storage: DiskFileStorage;
  let variants: ImageVariants;
  let original: Buffer;

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'verdure-variants-'));
    const config = { get: () => directory } as unknown as ConfigService;
    storage = new DiskFileStorage(config);
    variants = new ImageVariants(storage);
    original = await samplePhoto();
  }, 60_000);
  afterAll(() => rm(directory, { recursive: true, force: true }));

  it('makes a card copy of at most 60 KB, a tenth of the original, and keeps it', async () => {
    const key = await storage.upload(original, 'image/jpeg');

    const card = await variants.read(key, 480);

    expect(card?.contentType).toBe('image/webp');
    expect(card?.body.length).toBeLessThanOrEqual(60 * 1024);
    expect(card?.body.length).toBeLessThan(original.length / 10);
    expect((await sharp(card?.body).metadata()).width).toBe(480);
    const stored = await storage.read(variantKey(key, 480));
    expect(stored.body.length).toBe(card?.body.length);
  });

  it('removes the variants with the original', async () => {
    const key = await storage.upload(original, 'image/jpeg');
    await variants.read(key, 1280);

    await storage.remove(key);

    await expect(storage.read(variantKey(key, 1280))).rejects.toThrow();
  });

  it('answers undefined for a key nobody stored', async () => {
    expect(
      await variants.read('11111111-1111-4111-8111-111111111111', 480),
    ).toBeUndefined();
  });

  it('returns the original when the file is not an image', async () => {
    const key = await storage.upload(Buffer.from('not an image'), 'text/plain');

    const result = await variants.read(key, 480);

    expect(result?.contentType).toBe('text/plain');
  });
});
