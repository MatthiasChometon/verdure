import { TaxonomyService } from '../../infrastructure/taxonomy/service';
import { SpeciesReconciler } from './reconciler';
import { SpeciesRepository } from './repository';

const build = (
  speciesRepository: Partial<SpeciesRepository> = {},
  gbif: Partial<TaxonomyService> = {},
): SpeciesReconciler =>
  new SpeciesReconciler(
    speciesRepository as SpeciesRepository,
    gbif as TaxonomyService,
  );

describe('SpeciesReconciler', () => {
  it('matches the local index, dropping cultivars and punctuation', async () => {
    const match = vi.fn(() => Promise.resolve('Monstera deliciosa'));
    const reconciler = build({ match });

    await expect(
      reconciler.reconcile("Monstera deliciosa 'Variegata'"),
    ).resolves.toBe('Monstera deliciosa');
    expect(match).toHaveBeenCalledWith('Monstera deliciosa');
  });

  it('falls back to GBIF when the local index has no match', async () => {
    const match = vi.fn(() => Promise.resolve(undefined));
    const suggest = vi.fn(() =>
      Promise.resolve([{ key: 1, name: 'Aloe vera' }]),
    );
    const reconciler = build({ match }, { suggest });

    await expect(reconciler.reconcile('Aloe vera')).resolves.toBe('Aloe vera');
    expect(suggest).toHaveBeenCalledWith('Aloe vera');
  });

  it('keeps the cleaned binomial when GBIF also has nothing', async () => {
    const match = vi.fn(() => Promise.resolve(undefined));
    const suggest = vi.fn(() => Promise.resolve([]));
    const reconciler = build({ match }, { suggest });

    await expect(reconciler.reconcile('Ficus lyrata')).resolves.toBe(
      'Ficus lyrata',
    );
  });

  it('returns null when the guess has no usable name', async () => {
    const reconciler = build();

    await expect(reconciler.reconcile('123 !!!')).resolves.toBeNull();
  });
});
