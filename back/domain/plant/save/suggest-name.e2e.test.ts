import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { nickname } from '../../nickname/schema';
import { PlantTestHarness } from '../harness';

const SUGGEST = `query ($species: String, $lang: String) {
  suggestPlantName(species: $species, lang: $lang)
}`;

describe('Plant name suggestion (e2e)', () => {
  const harness = new PlantTestHarness();
  beforeAll(() => harness.init());
  afterAll(async () => {
    await harness.database.delete(nickname);
    await harness.close();
  });
  beforeEach(async () => {
    await harness.resetPlants();
    await harness.database.delete(nickname);
  });

  const suggest = async (
    species: string | null,
    lang: string | null,
  ): Promise<string | null> => {
    const { suggestPlantName } = await harness.graphql<{
      suggestPlantName: string | null;
    }>(SUGGEST, harness.aliceToken, { species, lang });
    return suggestPlantName;
  };

  it('picks from the bank of the first word of the species', async () => {
    await harness.database.insert(nickname).values([
      { genus: 'monstera', lang: 'fr', name: 'Jean-Michel le Monstera' },
      { genus: '', lang: 'fr', name: 'Caramel' },
    ]);

    // The genus bank wins over the generic one.
    expect(await suggest('Monstera deliciosa', 'fr')).toBe(
      'Jean-Michel le Monstera',
    );
  });

  it('skips a name the user already owns, whatever its case', async () => {
    await harness.database.insert(nickname).values([
      { genus: 'monstera', lang: 'fr', name: 'Jean-Michel le Monstera' },
      { genus: '', lang: 'fr', name: 'Caramel' },
    ]);
    await harness.createPlant(
      'jean-michel le monstera',
      'Monstera deliciosa',
      harness.aliceToken,
    );

    expect(await suggest('Monstera deliciosa', 'fr')).toBe('Caramel');
  });

  it('uses the generic bank when no species is given', async () => {
    await harness.database.insert(nickname).values([
      { genus: 'monstera', lang: 'fr', name: 'Jean-Michel le Monstera' },
      { genus: '', lang: 'fr', name: 'Caramel' },
    ]);

    expect(await suggest(null, 'fr')).toBe('Caramel');
    expect(await suggest('   ', 'fr')).toBe('Caramel');
  });

  it('defaults the language to English', async () => {
    await harness.database.insert(nickname).values([
      { genus: 'cactus', lang: 'en', name: 'Kevin the Cactus' },
      { genus: 'cactus', lang: 'fr', name: 'Kevin le Cactus' },
    ]);

    expect(await suggest('Cactus', null)).toBe('Kevin the Cactus');
  });

  it('suggests nothing when the bank has nothing left to offer', async () => {
    expect(await suggest('Ficus lyrata', 'en')).toBeNull();
  });
});
