import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PlantTestHarness } from '../../tests/harness';
import { PlantInputBuilder } from '../../tests/plant-input.builder';

type PlantPage = { items: { name: string }[]; total: number };

describe('Plant search, facets & sort (e2e)', () => {
  const harness = new PlantTestHarness();
  beforeAll(() => harness.init());
  afterAll(() => harness.close());
  beforeEach(() => harness.resetPlants());

  const withPhoto = (name: string, species: string): PlantInputBuilder =>
    new PlantInputBuilder()
      .named(name)
      .ofSpecies(species)
      .withImage('some-key');

  it('filters plants by a search term on name or species', async () => {
    await harness.createPlant(
      'Monstera',
      'Monstera deliciosa',
      harness.aliceToken,
    );
    await harness.createPlant('Aloe', 'Aloe vera', harness.aliceToken);

    const { plants } = await harness.graphql<{ plants: PlantPage }>(
      'query ($search: String) { plants(search: $search) { items { name } total } }',
      harness.aliceToken,
      { search: 'mon' },
    );
    expect(plants.total).toBe(1);
    expect(plants.items.map((current) => current.name)).toEqual(['Monstera']);
  });

  it('finds a plant despite a typo in the search term', async () => {
    await harness.createPlant(
      'Monstera',
      'Monstera deliciosa',
      harness.aliceToken,
    );
    await harness.createPlant('Aloe', 'Aloe vera', harness.aliceToken);

    const { plants } = await harness.graphql<{ plants: PlantPage }>(
      'query ($search: String) { plants(search: $search) { items { name } total } }',
      harness.aliceToken,
      { search: 'montera' },
    );
    expect(plants.total).toBe(1);
    expect(plants.items.map((current) => current.name)).toEqual(['Monstera']);
  });

  it('ranks plants by semantic similarity to the query', async () => {
    await harness.createPlant(
      'My Cactus',
      'Cactaceae opuntia',
      harness.aliceToken,
    );
    await harness.createPlant(
      'Boston Fern',
      'Nephrolepis exaltata',
      harness.aliceToken,
    );

    const { plants } = await harness.graphql<{ plants: PlantPage }>(
      'query { plants(sort: SEMANTIC, search: "a spiky cactus") { items { name } total } }',
      harness.aliceToken,
    );
    expect(plants.total).toBe(2);
    expect(plants.items[0]?.name).toBe('My Cactus');
  });

  it('exposes genus and photo facets for the collection', async () => {
    await harness.createPlant('Deli', 'Monstera deliciosa', harness.aliceToken);
    await harness.createPlant('Adan', 'Monstera adansonii', harness.aliceToken);
    await harness.create(withPhoto('Vera', 'Aloe vera'), harness.aliceToken);

    const { plantFacets } = await harness.graphql<{
      plantFacets: {
        genera: { value: string; count: number }[];
        withImage: number;
        withoutImage: number;
      };
    }>(
      '{ plantFacets { genera { value count } withImage withoutImage } }',
      harness.aliceToken,
    );

    expect(plantFacets.genera).toEqual([
      { value: 'monstera', count: 2 },
      { value: 'aloe', count: 1 },
    ]);
    expect(plantFacets.withImage).toBe(1);
    expect(plantFacets.withoutImage).toBe(2);
  });

  it('filters plants by genus and by photo presence', async () => {
    await harness.createPlant('Deli', 'Monstera deliciosa', harness.aliceToken);
    await harness.createPlant('Adan', 'Monstera adansonii', harness.aliceToken);
    await harness.create(withPhoto('Vera', 'Aloe vera'), harness.aliceToken);

    const { plants: byGenus } = await harness.graphql<{ plants: PlantPage }>(
      'query ($genus: String) { plants(genus: $genus) { total } }',
      harness.aliceToken,
      { genus: 'Monstera' },
    );
    expect(byGenus.total).toBe(2);

    const { plants: photos } = await harness.graphql<{ plants: PlantPage }>(
      'query ($hasImage: Boolean) { plants(hasImage: $hasImage) { items { name } total } }',
      harness.aliceToken,
      { hasImage: true },
    );
    expect(photos.total).toBe(1);
    expect(photos.items.map((current) => current.name)).toEqual(['Vera']);
  });

  it('sorts plants by name in ascending order', async () => {
    await harness.createPlant('Monstera', 'Whatever', harness.aliceToken);
    await harness.createPlant('Aloe', 'Whatever', harness.aliceToken);

    const { plants } = await harness.graphql<{ plants: PlantPage }>(
      'query { plants(sort: NAME, direction: ASC) { items { name } } }',
      harness.aliceToken,
    );
    expect(plants.items.map((current) => current.name)).toEqual([
      'Aloe',
      'Monstera',
    ]);
  });

  it('paginates with limit and offset while reporting the total', async () => {
    await harness.createPlant('Monstera', 'Whatever', harness.aliceToken);
    await harness.createPlant('Aloe', 'Whatever', harness.aliceToken);
    await harness.createPlant('Pothos', 'Whatever', harness.aliceToken);

    const { plants } = await harness.graphql<{ plants: PlantPage }>(
      'query { plants(sort: NAME, direction: ASC, limit: 2, offset: 0) { items { name } total } }',
      harness.aliceToken,
    );
    expect(plants.total).toBe(3);
    expect(plants.items.map((current) => current.name)).toEqual([
      'Aloe',
      'Monstera',
    ]);

    const { plants: nextPage } = await harness.graphql<{ plants: PlantPage }>(
      'query { plants(sort: NAME, direction: ASC, limit: 2, offset: 2) { items { name } total } }',
      harness.aliceToken,
    );
    expect(nextPage.total).toBe(3);
    expect(nextPage.items.map((current) => current.name)).toEqual(['Pothos']);
  });
});
