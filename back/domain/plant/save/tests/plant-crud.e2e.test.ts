import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PlantTestHarness } from '../../tests/harness';

type PlantPage = { items: { id: string; name: string }[]; total: number };

describe('Plant CRUD (e2e)', () => {
  const harness = new PlantTestHarness();
  beforeAll(() => harness.init());
  afterAll(() => harness.close());
  beforeEach(() => harness.resetPlants());

  it('creates a plant with no image and returns it in the list', async () => {
    const { createPlant: created } = await harness.createPlant(
      'Monstera',
      'Monstera deliciosa',
      harness.aliceToken,
    );
    expect(created).toMatchObject({
      name: 'Monstera',
      species: 'Monstera deliciosa',
      imageUrl: null,
    });

    const { plants } = await harness.graphql<{ plants: PlantPage }>(
      '{ plants { items { id name } total } }',
      harness.aliceToken,
    );
    expect(plants.total).toBe(1);
    expect(plants.items[0]).toMatchObject({ id: created.id, name: 'Monstera' });
  });

  it('updates an existing plant', async () => {
    const { createPlant: created } = await harness.createPlant(
      'Aloe',
      'Aloe vera',
      harness.aliceToken,
    );

    const { updatePlant } = await harness.graphql<{
      updatePlant: { id: string; name: string; species: string };
    }>(
      'mutation ($input: UpdatePlantInput!) { updatePlant(input: $input) { id name species } }',
      harness.aliceToken,
      {
        input: {
          id: created.id,
          name: 'Aloe Vera',
          species: 'Aloe barbadensis',
        },
      },
    );

    expect(updatePlant).toMatchObject({
      id: created.id,
      name: 'Aloe Vera',
      species: 'Aloe barbadensis',
    });
  });

  it('deletes a plant and removes it from the list', async () => {
    const { createPlant: kept } = await harness.createPlant(
      'Monstera',
      'Whatever',
      harness.aliceToken,
    );
    const { createPlant: removed } = await harness.createPlant(
      'Aloe',
      'Whatever',
      harness.aliceToken,
    );

    const { deletePlant } = await harness.graphql<{ deletePlant: boolean }>(
      'mutation ($id: ID!) { deletePlant(id: $id) }',
      harness.aliceToken,
      { id: removed.id },
    );
    expect(deletePlant).toBe(true);

    const { plants } = await harness.graphql<{ plants: PlantPage }>(
      '{ plants { items { id } total } }',
      harness.aliceToken,
    );
    expect(plants.total).toBe(1);
    expect(plants.items.map((current) => current.id)).toEqual([kept.id]);
  });

  it('returns false when deleting a plant that does not exist', async () => {
    const { deletePlant } = await harness.graphql<{ deletePlant: boolean }>(
      'mutation ($id: ID!) { deletePlant(id: $id) }',
      harness.aliceToken,
      { id: '00000000-0000-0000-0000-000000000000' },
    );
    expect(deletePlant).toBe(false);
  });
});
