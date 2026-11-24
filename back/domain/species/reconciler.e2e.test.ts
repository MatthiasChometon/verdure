import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SpeciesTestHarness } from './harness';
import { SpeciesReconciler } from './reconciler';

describe('SpeciesReconciler (e2e)', () => {
  const harness = new SpeciesTestHarness();
  beforeAll(() => harness.init());
  afterAll(() => harness.close());
  beforeEach(() => harness.reset());

  const reconcile = (guess: string): Promise<string | undefined> =>
    harness.resolve(SpeciesReconciler).reconcile(guess);

  it('matches the local index, dropping cultivars and punctuation', async () => {
    await harness.seed('Monstera deliciosa');
    harness.gbif.matches = [{ key: 99, name: 'Not consulted' }];

    expect(await reconcile("Monstera deliciosa 'Variegata'")).toBe(
      'Monstera deliciosa',
    );
    expect(harness.gbif.queries).toEqual([]);
  });

  it('tolerates a typo against the local index', async () => {
    await harness.seed('Rafflesia arnoldii');

    expect(await reconcile('Raflesia arnoldii')).toBe('Rafflesia arnoldii');
  });

  it('falls back to GBIF when the local index has no match', async () => {
    harness.gbif.matches = [{ key: 1, name: 'Aloe vera' }];

    expect(await reconcile('Aloe vera')).toBe('Aloe vera');
    expect(harness.gbif.queries).toEqual(['Aloe vera']);
  });

  it('keeps the cleaned binomial when GBIF also has nothing', async () => {
    expect(await reconcile('Ficus lyrata (fiddle leaf)')).toBe('Ficus lyrata');
  });

  it('answers undefined when the guess has no usable name', async () => {
    expect(await reconcile('123 !!!')).toBeUndefined();
    expect(harness.gbif.queries).toEqual([]);
  });
});
