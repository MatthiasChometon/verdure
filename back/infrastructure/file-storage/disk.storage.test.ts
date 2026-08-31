import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DiskFileStorage } from './disk.storage';

const configFor = (dir: string): ConfigService =>
  ({ get: (key: string) => (key === 'STORAGE_DIR' ? dir : undefined) }) as ConfigService;

describe('DiskFileStorage', () => {
  let dir: string;
  let storage: DiskFileStorage;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'verdure-storage-'));
    storage = new DiskFileStorage(configFor(dir));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('round-trips the bytes and the content type through a key', async () => {
    const key = await storage.upload(Buffer.from('leaf'), 'image/png');

    const read = await storage.read(key);

    expect(Buffer.from(read.body).toString()).toBe('leaf');
    expect(read.contentType).toBe('image/png');
  });

  it('forgets an image once it is removed', async () => {
    const key = await storage.upload(Buffer.from('leaf'), 'image/png');

    await storage.remove(key);

    await expect(storage.read(key)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('reports a missing image rather than throwing a raw fs error', async () => {
    await expect(storage.read(randomUUID())).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('refuses a key that is not one of our UUIDs, so it cannot escape the dir', async () => {
    await expect(storage.read('../../etc/passwd')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
