import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PlantTestHarness } from '../../tests/harness';
import { PlantInputBuilder } from '../../tests/plant-input.builder';

describe('Plant watering (e2e)', () => {
  const harness = new PlantTestHarness();
  beforeAll(() => harness.init());
  afterAll(() => harness.close());
  beforeEach(() => harness.resetPlants());

  const tracked = (
    name: string,
    species: string,
    summer: number | null,
    winter: number | null,
  ): PlantInputBuilder =>
    new PlantInputBuilder()
      .named(name)
      .ofSpecies(species)
      .tracked(summer, winter);

  // Watering dates use a safely-past year: the back rejects a wateredOn "in the
  // future", so hardcoded near-future dates break on a CI runner whose real clock
  // is before them. 2024 stays past on any real runner; the season (month) and the
  // ordering these tests assert are year-independent.
  it('schedules the next watering from the season of the watering', async () => {
    const { createPlant: plant } = await harness.create(
      tracked('Monstera', 'Monstera deliciosa', 5, 14),
      harness.aliceToken,
    );
    // A brand-new tracked plant has no watering yet.
    expect(plant.nextDueOn).toBeNull();

    const summer = await harness.water(
      plant.id,
      '2024-07-10',
      harness.aliceToken,
    );
    expect(summer.waterPlant).toEqual({
      lastWateredOn: '2024-07-10',
      nextDueOn: '2024-07-15',
    });

    const winter = await harness.water(
      plant.id,
      '2024-12-10',
      harness.aliceToken,
    );
    expect(winter.waterPlant).toEqual({
      lastWateredOn: '2024-12-10',
      nextDueOn: '2024-12-24',
    });
  });

  it('exposes watering events in a date range', async () => {
    const { createPlant: plant } = await harness.create(
      tracked('Aloe', 'Aloe vera', 7, 21),
      harness.aliceToken,
    );
    await harness.water(plant.id, '2024-05-01', harness.aliceToken);
    await harness.water(plant.id, '2024-05-20', harness.aliceToken);

    const { wateringEvents } = await harness.graphql<{
      wateringEvents: { plantName: string; wateredOn: string }[];
    }>(
      'query ($from: String!, $to: String!) { wateringEvents(from: $from, to: $to) { plantName wateredOn } }',
      harness.aliceToken,
      { from: '2024-05-01', to: '2024-05-10' },
    );

    expect(wateringEvents).toEqual([
      { plantName: 'Aloe', wateredOn: '2024-05-01' },
    ]);
  });

  it('recomputes the cycle after deleting a watering event', async () => {
    const { createPlant: plant } = await harness.create(
      tracked('Pothos', 'Epipremnum aureum', 6, 12),
      harness.aliceToken,
    );
    await harness.water(plant.id, '2024-06-01', harness.aliceToken);
    await harness.water(plant.id, '2024-06-20', harness.aliceToken);

    const { wateringEvents } = await harness.graphql<{
      wateringEvents: { id: string; wateredOn: string }[];
    }>(
      'query ($from: String!, $to: String!) { wateringEvents(from: $from, to: $to) { id wateredOn } }',
      harness.aliceToken,
      { from: '2024-06-01', to: '2024-06-30' },
    );
    const latest = wateringEvents.find(
      (event) => event.wateredOn === '2024-06-20',
    );
    expect(latest).toBeDefined();

    const { deleteWateringEvent } = await harness.graphql<{
      deleteWateringEvent: boolean;
    }>(
      'mutation ($id: ID!) { deleteWateringEvent(id: $id) }',
      harness.aliceToken,
      { id: latest!.id },
    );
    expect(deleteWateringEvent).toBe(true);

    const { plants } = await harness.graphql<{
      plants: { items: { lastWateredOn: string | null }[] };
    }>('{ plants { items { lastWateredOn } } }', harness.aliceToken);
    expect(plants.items[0]?.lastWateredOn).toBe('2024-06-01');
  });

  it('sorts by watering urgency, tracked-and-overdue first', async () => {
    const { createPlant: soon } = await harness.create(
      tracked('Soon', 'Later plant', 30, 30),
      harness.aliceToken,
    );
    const { createPlant: overdue } = await harness.create(
      tracked('Overdue', 'Thirsty plant', 3, 3),
      harness.aliceToken,
    );
    await harness.createPlant('Untracked', 'No schedule', harness.aliceToken);
    await harness.water(soon.id, '2024-07-01', harness.aliceToken);
    await harness.water(overdue.id, '2024-07-01', harness.aliceToken);

    const { plants } = await harness.graphql<{
      plants: { items: { name: string }[] };
    }>(
      'query { plants(sort: WATERING) { items { name } } }',
      harness.aliceToken,
    );

    expect(plants.items.map((current) => current.name)).toEqual([
      'Overdue',
      'Soon',
      'Untracked',
    ]);
  });

  it("does not let a user water another user's plant", async () => {
    const { createPlant: plant } = await harness.create(
      tracked('Alice Plant', 'Alicea', 5, 10),
      harness.aliceToken,
    );

    const body = await harness.request<{ waterPlant: { id: string } }>(
      'mutation ($input: WaterPlantInput!) { waterPlant(input: $input) { id } }',
      { input: { plantId: plant.id, wateredOn: '2024-07-10' } },
      harness.bobToken,
    );
    expect(body.errors).toBeDefined();

    const { wateringEvents } = await harness.graphql<{
      wateringEvents: unknown[];
    }>(
      'query ($from: String!, $to: String!) { wateringEvents(from: $from, to: $to) { id } }',
      harness.aliceToken,
      { from: '2024-07-01', to: '2024-07-31' },
    );
    expect(wateringEvents).toEqual([]);
  });

  it('does not create a duplicate watering on the same day', async () => {
    const { createPlant: plant } = await harness.create(
      tracked('Fig', 'Ficus lyrata', 7, 14),
      harness.aliceToken,
    );
    // Today (dynamic) — a hardcoded date is "in the future" on a CI runner whose
    // real clock is before it, which the back rejects.
    const day = new Date().toISOString().slice(0, 10);
    await harness.water(plant.id, day, harness.aliceToken);
    await harness.water(plant.id, day, harness.aliceToken);

    const { wateringEvents } = await harness.graphql<{
      wateringEvents: unknown[];
    }>(
      'query ($from: String!, $to: String!) { wateringEvents(from: $from, to: $to) { id } }',
      harness.aliceToken,
      { from: day, to: day },
    );
    expect(wateringEvents).toHaveLength(1);
  });

  it('suggests the seeded interval for a known genus, generic otherwise', async () => {
    const known = await harness.graphql<{
      wateringDefault: { summerDays: number; winterDays: number };
    }>(
      'query ($species: String!) { wateringDefault(species: $species) { summerDays winterDays } }',
      harness.aliceToken,
      { species: 'Monstera deliciosa' },
    );
    expect(known.wateringDefault).toEqual({ summerDays: 7, winterDays: 12 });

    const unknown = await harness.graphql<{
      wateringDefault: { summerDays: number; winterDays: number };
    }>(
      'query ($species: String!) { wateringDefault(species: $species) { summerDays winterDays } }',
      harness.aliceToken,
      { species: 'Zzz unknownicus' },
    );
    expect(unknown.wateringDefault).toEqual({ summerDays: 7, winterDays: 14 });
  });
});
