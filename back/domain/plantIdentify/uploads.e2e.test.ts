import { JwtService } from '@nestjs/jwt';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type Database } from '../../infrastructure/database/token';
import { FileStorageService } from '../../infrastructure/file-storage/service';
import { IdentificationService } from '../../infrastructure/identification/service';
import { TaxonomyService } from '../../infrastructure/taxonomy/service';
import { bootTestApp } from '../../infrastructure/testing/test-app';
import { SessionCookie } from '../auth/currentUser/cookie';
import { user } from '../user/schema';
import { insertTestUser } from '../user/test-user';

const BOUNDARY = 'test-boundary';

// External boundaries only: the vision model, GBIF and the object store.
class VisionStub {
  guess: string | undefined;
  received: Buffer | undefined;

  identifyPlant(image: Buffer): Promise<string | undefined> {
    this.received = image;
    return Promise.resolve(this.guess);
  }
}

class TaxonomyStub {
  suggest(): Promise<{ key: number; name: string }[]> {
    return Promise.resolve([{ key: 1, name: 'Monstera deliciosa' }]);
  }
}

class StorageStub {
  uploaded: { size: number; contentType: string }[] = [];

  upload(buffer: Buffer, contentType: string): Promise<string> {
    this.uploaded.push({ size: buffer.length, contentType });
    return Promise.resolve('plants/generated');
  }
}

const multipart = (contentType: string): Buffer =>
  Buffer.concat([
    Buffer.from(
      `--${BOUNDARY}\r\nContent-Disposition: form-data; name="file"; filename="photo"\r\nContent-Type: ${contentType}\r\n\r\n`,
    ),
    Buffer.from('image-bytes'),
    Buffer.from(`\r\n--${BOUNDARY}--\r\n`),
  ]);

describe('plant uploads (e2e)', () => {
  const vision = new VisionStub();
  const storage = new StorageStub();
  let app: NestFastifyApplication;
  let database: Database;
  let cookie: string;

  beforeAll(async () => {
    const booted = await bootTestApp([
      { provide: IdentificationService, useValue: vision },
      { provide: TaxonomyService, useValue: new TaxonomyStub() },
      { provide: FileStorageService, useValue: storage },
    ]);
    app = booted.app;
    database = booted.database;
    await database.delete(user);
    const uploader = await insertTestUser(database, 'uploader');
    const token = await app.get(JwtService).signAsync({ sub: uploader.id });
    cookie = `${app.get(SessionCookie).token}=${token}`;
  });

  afterAll(async () => {
    await database.delete(user);
    await app.close();
  });

  const post = (
    url: string,
    payload: Buffer | undefined,
    headers: Record<string, string> = { cookie },
  ): ReturnType<NestFastifyApplication['inject']> =>
    app.inject({
      method: 'POST',
      url,
      payload,
      headers: {
        'content-type': `multipart/form-data; boundary=${BOUNDARY}`,
        ...headers,
      },
    });

  describe('identify-plant', () => {
    it('reconciles the vision guess to a canonical species', async () => {
      vision.guess = "Monstera deliciosa 'Variegata'";

      const response = await post(
        '/uploads/identify-plant',
        multipart('image/jpeg'),
      );

      expect(response.statusCode).toBe(201);
      expect(response.json()).toEqual({ species: 'Monstera deliciosa' });
      expect(vision.received?.toString()).toBe('image-bytes');
    });

    it('answers a null species when the model cannot identify a plant', async () => {
      vision.guess = undefined;

      const response = await post(
        '/uploads/identify-plant',
        multipart('image/jpeg'),
      );

      expect(response.json()).toEqual({ species: null });
    });

    it('requires a signed-in user', async () => {
      const response = await post(
        '/uploads/identify-plant',
        multipart('image/jpeg'),
        {},
      );

      expect(response.statusCode).toBe(401);
    });
  });

  describe('plant-image', () => {
    it('stores an image and returns its key', async () => {
      storage.uploaded = [];

      const response = await post(
        '/uploads/plant-image',
        multipart('image/png'),
      );

      expect(response.json()).toEqual({ key: 'plants/generated' });
      expect(storage.uploaded).toEqual([
        { size: 'image-bytes'.length, contentType: 'image/png' },
      ]);
    });

    it('rejects a non-image file without touching storage', async () => {
      storage.uploaded = [];

      const response = await post(
        '/uploads/plant-image',
        multipart('text/plain'),
      );

      expect(response.statusCode).toBe(400);
      expect(storage.uploaded).toEqual([]);
    });

    it('rejects a request without a file', async () => {
      const response = await post(
        '/uploads/plant-image',
        Buffer.from(`--${BOUNDARY}--\r\n`),
      );

      expect(response.statusCode).toBe(400);
    });
  });
});
