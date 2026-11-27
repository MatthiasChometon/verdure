import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ConfigService } from '@nestjs/config';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { DiskFileStorage } from './disk.storage';
import { variantKey } from './image-variants';
import { ImageVariants } from './image-variants.service';

// Simulates a host where sharp's native binary does not load (glibc too old, optional
// dependency not installed): the API must stay up and serve the original image.
vi.mock('sharp', () => {
  throw new Error(
    'Could not load the "sharp" module using the linux-x64 runtime',
  );
});

describe('ImageVariants when sharp cannot load', () => {
  let directory: string;
  let storage: DiskFileStorage;
  let variants: ImageVariants;

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'verdure-failsoft-'));
    storage = new DiskFileStorage({
      get: () => directory,
    } as unknown as ConfigService);
    variants = new ImageVariants(storage);
  });
  afterAll(() => rm(directory, { recursive: true, force: true }));

  it('serves the original, stores no variant, and warns only once', async () => {
    const original = Buffer.from('not decoded anyway');
    const first = await storage.upload(original, 'image/jpeg');
    const second = await storage.upload(original, 'image/jpeg');
    const warn = vi
      .spyOn((await import('@nestjs/common')).Logger.prototype, 'warn')
      .mockImplementation(() => undefined);

    const one = await variants.read(first, 480);
    const two = await variants.read(second, 960);

    expect(one?.contentType).toBe('image/jpeg');
    expect(Buffer.from(one?.body ?? []).equals(original)).toBe(true);
    expect(two?.contentType).toBe('image/jpeg');
    await expect(storage.read(variantKey(first, 480))).rejects.toThrow();
    const loadWarnings = warn.mock.calls.filter(([message]) =>
      String(message).includes('sharp cannot be loaded'),
    );
    expect(loadWarnings).toHaveLength(1);
    warn.mockRestore();
  });
});
