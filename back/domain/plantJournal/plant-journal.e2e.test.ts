import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { eq } from 'drizzle-orm';
import { plant } from '../plant/schema';
import { FileStorageService } from '../../infrastructure/file-storage/service';
import { PlantTestHarness } from '../plant/harness';

type JournalEntry = {
  id: string;
  plantId: string;
  kind: string;
  note: string | null;
  imageUrl: string | null;
  createdAt: string;
};

const ENTRIES = `query ($plantId: ID!) {
  journalEntries(plantId: $plantId) {
    id
    plantId
    kind
    note
    imageUrl
    createdAt
  }
}`;

const ADD = `mutation ($input: AddJournalEntryInput!) {
  addJournalEntry(input: $input) {
    id
    kind
    note
    imageUrl
  }
}`;

const DELETE = `mutation ($id: ID!) {
  deleteJournalEntry(id: $id)
}`;

describe('Plant journal (e2e)', () => {
  const harness = new PlantTestHarness();
  beforeAll(() => harness.init());
  afterAll(() => harness.close());
  beforeEach(() => harness.resetPlants());

  const createPlant = async (): Promise<string> => {
    const { createPlant: created } = await harness.createPlant(
      'Monstera',
      'Monstera deliciosa',
      harness.aliceToken,
    );
    return created.id;
  };

  it('adds an entry and lists it back, most recent first', async () => {
    const plantId = await createPlant();

    await harness.graphql<{ addJournalEntry: JournalEntry }>(
      ADD,
      harness.aliceToken,
      {
        input: { plantId, kind: 'NOTE', note: 'Unfurled a new leaf.' },
      },
    );
    await harness.graphql<{ addJournalEntry: JournalEntry }>(
      ADD,
      harness.aliceToken,
      {
        input: { plantId, kind: 'REPOTTING', note: 'Moved to a bigger pot.' },
      },
    );

    const { journalEntries } = await harness.graphql<{
      journalEntries: JournalEntry[];
    }>(ENTRIES, harness.aliceToken, { plantId });

    expect(journalEntries).toHaveLength(2);
    expect(journalEntries[0]?.kind).toBe('REPOTTING');
    expect(journalEntries[1]?.kind).toBe('NOTE');
    expect(journalEntries[0]?.note).toBe('Moved to a bigger pot.');
    expect(journalEntries[0]?.imageUrl).toBeNull();
  });

  it('accepts a photo-only entry (no note)', async () => {
    const plantId = await createPlant();

    const { addJournalEntry } = await harness.graphql<{
      addJournalEntry: JournalEntry;
    }>(ADD, harness.aliceToken, {
      input: { plantId, kind: 'PHOTO' },
    });

    expect(addJournalEntry.kind).toBe('PHOTO');
    expect(addJournalEntry.note).toBeNull();
  });

  it('rejects adding an entry to a plant the user does not own', async () => {
    const plantId = await createPlant();

    const body = await harness.request<{ addJournalEntry: JournalEntry }>(
      ADD,
      { input: { plantId, kind: 'NOTE', note: 'Sneaky.' } },
      harness.bobToken,
    );

    expect(body.errors).toBeDefined();
  });

  it("never lists another user's entries", async () => {
    const plantId = await createPlant();
    await harness.graphql(ADD, harness.aliceToken, {
      input: { plantId, kind: 'NOTE', note: 'Private.' },
    });

    const { journalEntries } = await harness.graphql<{
      journalEntries: JournalEntry[];
    }>(ENTRIES, harness.bobToken, { plantId });

    expect(journalEntries).toEqual([]);
  });

  it('deletes an entry the user owns, and refuses one they do not', async () => {
    const plantId = await createPlant();
    const { addJournalEntry } = await harness.graphql<{
      addJournalEntry: JournalEntry;
    }>(ADD, harness.aliceToken, {
      input: { plantId, kind: 'NOTE', note: 'To remove.' },
    });

    const denied = await harness.graphql<{ deleteJournalEntry: boolean }>(
      DELETE,
      harness.bobToken,
      { id: addJournalEntry.id },
    );
    expect(denied.deleteJournalEntry).toBe(false);

    const removed = await harness.graphql<{ deleteJournalEntry: boolean }>(
      DELETE,
      harness.aliceToken,
      { id: addJournalEntry.id },
    );
    expect(removed.deleteJournalEntry).toBe(true);

    const { journalEntries } = await harness.graphql<{
      journalEntries: JournalEntry[];
    }>(ENTRIES, harness.aliceToken, { plantId });
    expect(journalEntries).toEqual([]);
  });

  it('refuses a photo key that is not an upload key', async () => {
    const plantId = await createPlant();

    const body = await harness.request(
      ADD,
      { input: { plantId, kind: 'PHOTO', imageKey: '../../etc/passwd' } },
      harness.aliceToken,
    );

    expect(body.errors).toBeDefined();
  });

  it("refuses a photo key already used by another user's entry", async () => {
    const alicePlant = await createPlant();
    const key = randomUUID();
    await harness.graphql(ADD, harness.aliceToken, {
      input: { plantId: alicePlant, kind: 'PHOTO', imageKey: key },
    });
    const { createPlant: bobPlant } = await harness.createPlant(
      'Ficus',
      'Ficus lyrata',
      harness.bobToken,
    );

    const body = await harness.request(
      ADD,
      { input: { plantId: bobPlant.id, kind: 'PHOTO', imageKey: key } },
      harness.bobToken,
    );

    expect(body.errors).toBeDefined();
  });

  it('keeps the stored photo while another entry still uses its key', async () => {
    const plantId = await createPlant();
    const key = randomUUID();
    const first = await harness.graphql<{ addJournalEntry: JournalEntry }>(
      ADD,
      harness.aliceToken,
      { input: { plantId, kind: 'PHOTO', imageKey: key } },
    );
    await harness.graphql(ADD, harness.aliceToken, {
      input: { plantId, kind: 'PHOTO', imageKey: key },
    });
    const storage = vi
      .spyOn(harness.resolve(FileStorageService), 'remove')
      .mockResolvedValue(undefined);

    await harness.graphql(DELETE, harness.aliceToken, {
      id: first.addJournalEntry.id,
    });

    expect(storage).not.toHaveBeenCalled();
    storage.mockRestore();
  });

  it("refuses a photo key already used by another user's plant", async () => {
    const alicePlant = await createPlant();
    const key = randomUUID();
    await harness.database
      .update(plant)
      .set({ imageKey: key })
      .where(eq(plant.id, alicePlant));
    const { createPlant: bobPlant } = await harness.createPlant(
      'Ficus',
      'Ficus lyrata',
      harness.bobToken,
    );

    const body = await harness.request(
      ADD,
      { input: { plantId: bobPlant.id, kind: 'PHOTO', imageKey: key } },
      harness.bobToken,
    );

    expect(body.errors).toBeDefined();
  });

  it('keeps the stored photo while a plant still uses its key', async () => {
    const plantId = await createPlant();
    const key = randomUUID();
    await harness.database
      .update(plant)
      .set({ imageKey: key })
      .where(eq(plant.id, plantId));
    const { addJournalEntry } = await harness.graphql<{
      addJournalEntry: JournalEntry;
    }>(ADD, harness.aliceToken, {
      input: { plantId, kind: 'PHOTO', imageKey: key },
    });
    const storage = vi
      .spyOn(harness.resolve(FileStorageService), 'remove')
      .mockResolvedValue(undefined);

    await harness.graphql(DELETE, harness.aliceToken, {
      id: addJournalEntry.id,
    });

    expect(storage).not.toHaveBeenCalled();
    storage.mockRestore();
  });

  it('still deletes the entry when its photo cannot be removed', async () => {
    const plantId = await createPlant();
    const { addJournalEntry } = await harness.graphql<{
      addJournalEntry: JournalEntry;
    }>(ADD, harness.aliceToken, {
      input: { plantId, kind: 'PHOTO', imageKey: randomUUID() },
    });
    const storage = vi
      .spyOn(harness.resolve(FileStorageService), 'remove')
      .mockRejectedValue(new Error('object store unreachable'));
    const logged = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    const removed = await harness.graphql<{ deleteJournalEntry: boolean }>(
      DELETE,
      harness.aliceToken,
      { id: addJournalEntry.id },
    );

    expect(removed.deleteJournalEntry).toBe(true);
    expect(storage).toHaveBeenCalledOnce();
    expect(logged).toHaveBeenCalledOnce();
    const { journalEntries } = await harness.graphql<{
      journalEntries: JournalEntry[];
    }>(ENTRIES, harness.aliceToken, { plantId });
    expect(journalEntries).toEqual([]);
    storage.mockRestore();
    logged.mockRestore();
  });

  it('requires authentication', async () => {
    const plantId = await createPlant();

    const body = await harness.request<{ journalEntries: JournalEntry[] }>(
      ENTRIES,
      {
        plantId,
      },
    );

    expect(body.errors).toBeDefined();
  });
});
