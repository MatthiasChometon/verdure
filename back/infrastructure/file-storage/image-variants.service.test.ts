import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
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

  it('shares one run between concurrent first requests for the same image and width', async () => {
    const key = await storage.upload(original, 'image/jpeg');
    const reads = vi.spyOn(storage, 'read');

    const [first, second, third] = await Promise.all([
      variants.read(key, 480),
      variants.read(key, 480),
      variants.read(key, 480),
    ]);

    expect(second).toBe(first);
    expect(third).toBe(first);
    // One look for the variant and one read of the original, not three of each.
    expect(reads).toHaveBeenCalledTimes(2);
    reads.mockRestore();
  });

  it('decodes one image at a time', async () => {
    const keys = await Promise.all([
      storage.upload(original, 'image/jpeg'),
      storage.upload(original, 'image/jpeg'),
      storage.upload(original, 'image/jpeg'),
    ]);
    type Resizing = {
      resize: (body: Uint8Array, width: number) => Promise<unknown>;
    };
    const prototype = ImageVariants.prototype as unknown as Resizing;
    const real = prototype.resize;
    let running = 0;
    let peak = 0;
    const spy = vi
      .spyOn(prototype, 'resize')
      .mockImplementation(async function (this: unknown, body, width) {
        running += 1;
        peak = Math.max(peak, running);
        const result = await real.call(this, body, width);
        running -= 1;
        return result;
      });

    await Promise.all(keys.map((key) => variants.read(key, 480)));

    expect(spy).toHaveBeenCalledTimes(3);
    expect(peak).toBe(1);
    spy.mockRestore();
  });

  it('refuses to decode a picture over the pixel limit and serves the original', async () => {
    const huge = await sharp({
      create: { width: 8000, height: 6000, channels: 3, background: '#336' },
    })
      .png({ compressionLevel: 9 })
      .toBuffer();
    const key = await storage.upload(huge, 'image/png');

    const result = await variants.read(key, 480);

    expect(result?.contentType).toBe('image/png');
  }, 30_000);
});
