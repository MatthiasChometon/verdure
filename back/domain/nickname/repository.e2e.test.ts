import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type Database } from '../../infrastructure/database/token';
import { bootTestApp } from '../../infrastructure/testing/test-app';
import { NicknameRepository } from './repository';
import { nickname } from './schema';

describe('NicknameRepository (e2e)', () => {
  let app: NestFastifyApplication;
  let database: Database;
  let repository: NicknameRepository;
  const previousSeedSetting = process.env.SEED_ON_STARTUP;

  beforeAll(async () => {
    // The boot seeder would refill the bank under the tests' feet.
    process.env.SEED_ON_STARTUP = 'false';
    ({ app, database } = await bootTestApp());
    repository = app.get(NicknameRepository);
  });
  afterAll(async () => {
    await database.delete(nickname);
    await app.close();
    if (previousSeedSetting === undefined) {
      delete process.env.SEED_ON_STARTUP;
    } else {
      process.env.SEED_ON_STARTUP = previousSeedSetting;
    }
  });
  beforeEach(async () => {
    await database.delete(nickname);
  });

  describe('replaceAll', () => {
    it('replaces the whole bank', async () => {
      await repository.replaceAll([{ genus: '', lang: 'en', name: 'Old' }]);

      await repository.replaceAll([{ genus: '', lang: 'en', name: 'New' }]);

      const rows = await database.select().from(nickname);
      expect(rows.map((row) => row.name)).toEqual(['New']);
    });

    it('keeps the previous bank when a write fails half-way', async () => {
      await repository.replaceAll([{ genus: '', lang: 'en', name: 'Old' }]);
      const duplicate = { genus: '', lang: 'en', name: 'Twice' };

      await expect(
        repository.replaceAll([duplicate, duplicate]),
      ).rejects.toThrow();

      const rows = await database.select().from(nickname);
      expect(rows.map((row) => row.name)).toEqual(['Old']);
    });
  });

  describe('pick', () => {
    it('answers undefined when the bank has nothing left to offer', async () => {
      await repository.replaceAll([{ genus: '', lang: 'en', name: 'Biscuit' }]);

      expect(
        await repository.pick(undefined, 'en', ['biscuit']),
      ).toBeUndefined();
      expect(await repository.pick(undefined, 'fr', [])).toBeUndefined();
    });
  });
});
