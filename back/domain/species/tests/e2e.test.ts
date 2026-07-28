import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SpeciesTestHarness } from './harness';

describe('Species GraphQL (e2e)', () => {
  const harness = new SpeciesTestHarness();
  beforeAll(() => harness.init());
  afterAll(() => harness.close());
  beforeEach(() => harness.reset());

  it('returns GBIF suggestions and caches them for later', async () => {
    harness.gbif.matches = [
      { key: 1, name: 'Monstera deliciosa' },
      { key: 2, name: 'Monstera adansonii' },
    ];

    expect(await harness.suggest('mon')).toEqual([
      'Monstera deliciosa',
      'Monstera adansonii',
    ]);

    // Now GBIF is silent, but the cache keeps answering.
    harness.gbif.matches = [];
    expect(await harness.suggest('mon')).toEqual([
      'Monstera adansonii',
      'Monstera deliciosa',
    ]);
  });

  it('ignores a search shorter than two characters', async () => {
    harness.gbif.matches = [{ key: 1, name: 'Aloe vera' }];
    expect(await harness.suggest('a')).toEqual([]);
  });

  it('rejects an unauthenticated suggestions query', async () => {
    const response = await harness.suggestUnauthenticated('mon');
    const body = response.json<{ errors?: unknown[] }>();
    expect(body.errors).toBeDefined();
  });
});
