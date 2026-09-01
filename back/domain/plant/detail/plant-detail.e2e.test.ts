import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PlantTestHarness } from '../harness';

type DetailQuery = {
  plant: {
    id: string;
    name: string;
    species: string;
    imageUrl: string | null;
    lastWateredOn: string | null;
    wateringHistory: { wateredOn: string }[];
  } | null;
};

const DETAIL = `query ($id: ID!) {
  plant(id: $id) {
    id
    name
    species
    imageUrl
    lastWateredOn
    wateringHistory { wateredOn }
  }
}`;

describe('Plant detail (e2e)', () => {
  const harness = new PlantTestHarness();
  beforeAll(() => harness.init());
  afterAll(() => harness.close());
  beforeEach(() => harness.resetPlants());

  it('returns a plant with its watering history, most recent first', async () => {
    const { createPlant: created } = await harness.createPlant(
      'Monstera',
      'Monstera deliciosa',
      harness.aliceToken,
    );
    await harness.water(created.id, '2024-05-01', harness.aliceToken);
    await harness.water(created.id, '2024-06-01', harness.aliceToken);

    const { plant } = await harness.graphql<DetailQuery>(
      DETAIL,
      harness.aliceToken,
      {
        id: created.id,
      },
    );

    expect(plant).not.toBeNull();
    expect(plant?.name).toBe('Monstera');
    expect(plant?.species).toBe('Monstera deliciosa');
    expect(plant?.lastWateredOn).toBe('2024-06-01');
    expect(plant?.wateringHistory.map((event) => event.wateredOn)).toEqual([
      '2024-06-01',
      '2024-05-01',
    ]);
  });

  it('returns an empty history for a never-watered plant', async () => {
    const { createPlant: created } = await harness.createPlant(
      'Aloe',
      'Aloe vera',
      harness.aliceToken,
    );

    const { plant } = await harness.graphql<DetailQuery>(
      DETAIL,
      harness.aliceToken,
      {
        id: created.id,
      },
    );

    expect(plant?.wateringHistory).toEqual([]);
    expect(plant?.lastWateredOn).toBeNull();
  });

  it('returns null for a plant the user does not own', async () => {
    const { createPlant: created } = await harness.createPlant(
      'Alice Fern',
      'Nephrolepis exaltata',
      harness.aliceToken,
    );

    const { plant } = await harness.graphql<DetailQuery>(
      DETAIL,
      harness.bobToken,
      {
        id: created.id,
      },
    );

    expect(plant).toBeNull();
  });

  it('requires authentication', async () => {
    const { createPlant: created } = await harness.createPlant(
      'Pothos',
      'Epipremnum aureum',
      harness.aliceToken,
    );

    const body = await harness.request<DetailQuery>(DETAIL, { id: created.id });

    expect(body.errors).toBeDefined();
  });
});
