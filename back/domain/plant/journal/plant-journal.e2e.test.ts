import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PlantTestHarness } from '../harness';

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
    expect(journalEntries[0].kind).toBe('REPOTTING');
    expect(journalEntries[1].kind).toBe('NOTE');
    expect(journalEntries[0].note).toBe('Moved to a bigger pot.');
    expect(journalEntries[0].imageUrl).toBeNull();
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
