import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileStorageService } from './service';

// Stores images on the local filesystem — no object store, no external account.
// This is the default driver, and the one used on shared hosting (o2switch),
// where STORAGE_DIR should point OUTSIDE the app directory so a redeploy that
// wipes the app tree does not take the images with it.
@Injectable()
export class DiskFileStorage extends FileStorageService {
  // Keys are UUIDs we mint; reject anything else so a crafted key can never walk
  // out of the storage directory when it arrives from the public image route.
  private static readonly KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

  private readonly root: string;

  constructor(config: ConfigService) {
    super();
    this.root = config.get<string>('STORAGE_DIR') ?? join(process.cwd(), 'storage');
  }

  async upload(body: Buffer, contentType: string): Promise<string> {
    const key = randomUUID();
    await mkdir(this.root, { recursive: true });
    await writeFile(this.blobPath(key), body);
    // The content type lives in a sidecar so `read` can hand it back verbatim.
    await writeFile(this.typePath(key), contentType, 'utf8');
    return key;
  }

  async remove(key: string): Promise<void> {
    if (!DiskFileStorage.KEY.test(key)) {
      return;
    }
    await Promise.all([
      unlink(this.blobPath(key)).catch(ignoreMissing),
      unlink(this.typePath(key)).catch(ignoreMissing),
    ]);
  }

  async read(key: string): Promise<{ body: Uint8Array; contentType: string }> {
    if (!DiskFileStorage.KEY.test(key)) {
      throw new NotFoundException('Image not found.');
    }
    const body = await readFile(this.blobPath(key)).catch(() => {
      throw new NotFoundException('Image not found.');
    });
    const contentType = await readFile(this.typePath(key), 'utf8').catch(
      () => 'application/octet-stream',
    );
    return { body, contentType };
  }

  private blobPath(key: string): string {
    return join(this.root, key);
  }

  private typePath(key: string): string {
    return join(this.root, `${key}.type`);
  }
}

const ignoreMissing = (error: NodeJS.ErrnoException): void => {
  if (error.code !== 'ENOENT') {
    throw error;
  }
};
