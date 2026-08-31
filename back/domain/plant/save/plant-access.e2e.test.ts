import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PlantConstraints } from '../plant-constraints';
import { PlantTestHarness } from '../harness';
import { PlantInputBuilder } from '../plant-input.builder';

type PlantPage = { items: { name: string }[]; total: number };

describe('Plant access control (e2e)', () => {
  const harness = new PlantTestHarness();
  beforeAll(() => harness.init());
  afterAll(() => harness.close());
  beforeEach(() => harness.resetPlants());

  it('only returns plants that belong to the requesting user', async () => {
    await harness.createPlant('Alice Fern', 'Nephrolepis', harness.aliceToken);

    const { plants: bobPlants } = await harness.graphql<{ plants: PlantPage }>(
      '{ plants { items { name } total } }',
      harness.bobToken,
    );
    expect(bobPlants.total).toBe(0);
    expect(bobPlants.items).toEqual([]);

    const { plants: alicePlants } = await harness.graphql<{
      plants: PlantPage;
    }>('{ plants { items { name } total } }', harness.aliceToken);
    expect(alicePlants.items.map((current) => current.name)).toEqual([
      'Alice Fern',
    ]);
  });

  it("does not let a user update another user's plant", async () => {
    const { createPlant: created } = await harness.createPlant(
      'Alice Plant',
      'Alicea',
      harness.aliceToken,
    );

    const body = await harness.request<{ updatePlant: { id: string } }>(
      'mutation ($input: UpdatePlantInput!) { updatePlant(input: $input) { id } }',
      { input: { id: created.id, name: 'Hacked', species: 'Hackea' } },
      harness.bobToken,
    );
    expect(body.errors).toBeDefined();

    const { plants } = await harness.graphql<{ plants: PlantPage }>(
      '{ plants { items { name } total } }',
      harness.aliceToken,
    );
    expect(plants.items.map((current) => current.name)).toEqual([
      'Alice Plant',
    ]);
  });

  it("does not let a user delete another user's plant", async () => {
    const { createPlant: created } = await harness.createPlant(
      'Alice Plant',
      'Alicea',
      harness.aliceToken,
    );

    const { deletePlant } = await harness.graphql<{ deletePlant: boolean }>(
      'mutation ($id: ID!) { deletePlant(id: $id) }',
      harness.bobToken,
      { id: created.id },
    );
    expect(deletePlant).toBe(false);

    const { plants } = await harness.graphql<{ plants: PlantPage }>(
      '{ plants { items { name } total } }',
      harness.aliceToken,
    );
    expect(plants.total).toBe(1);
    expect(plants.items.map((current) => current.name)).toEqual([
      'Alice Plant',
    ]);
  });

  it('rejects an unauthenticated plants query', async () => {
    const body = await harness.request<{ plants: unknown }>(
      '{ plants { total } }',
    );
    expect(body.errors).toBeDefined();
  });

  it('rejects a plant whose name exceeds the maximum length', async () => {
    const tooLong = new PlantInputBuilder()
      .named('a'.repeat(PlantConstraints.nameMaxLength + 1))
      .ofSpecies('Ferns')
      .build();

    const body = await harness.request<{ createPlant: { id: string } }>(
      'mutation ($input: CreatePlantInput!) { createPlant(input: $input) { id } }',
      { input: tooLong },
      harness.aliceToken,
    );
    expect(body.errors).toBeDefined();

    const { plants } = await harness.graphql<{ plants: PlantPage }>(
      '{ plants { total } }',
      harness.aliceToken,
    );
    expect(plants.total).toBe(0);
  });
});
