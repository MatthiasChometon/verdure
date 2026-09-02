import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PlantTestHarness } from '../harness';

type Advice = {
  speciesAdvice: {
    watering: { summerDays: number; winterDays: number };
    safety: { level: string; note: string | null };
  };
};

const QUERY =
  'query ($species: String!, $lang: String) { speciesAdvice(species: $species, lang: $lang) { watering { summerDays winterDays } safety { level note } } }';

describe('Species advice (e2e)', () => {
  const harness = new PlantTestHarness();
  beforeAll(() => harness.init());
  afterAll(() => harness.close());

  it('returns the seeded rhythm and toxicity for a known toxic genus', async () => {
    const { speciesAdvice } = await harness.graphql<Advice>(
      QUERY,
      harness.aliceToken,
      { species: 'Monstera deliciosa', lang: 'en' },
    );

    expect(speciesAdvice.watering).toEqual({ summerDays: 7, winterDays: 12 });
    expect(speciesAdvice.safety.level).toBe('TOXIC');
    expect(speciesAdvice.safety.note).toMatch(/oxalate/i);
  });

  it('localises the safety note', async () => {
    const { speciesAdvice } = await harness.graphql<Advice>(
      QUERY,
      harness.aliceToken,
      { species: 'Monstera deliciosa', lang: 'fr' },
    );

    expect(speciesAdvice.safety.note).toMatch(/oxalate/i);
    expect(speciesAdvice.safety.note).toContain('mâchée');
  });

  it('falls back to a generic rhythm and UNKNOWN toxicity for an unknown species', async () => {
    const { speciesAdvice } = await harness.graphql<Advice>(
      QUERY,
      harness.aliceToken,
      { species: 'Zzz unknownicus', lang: 'en' },
    );

    expect(speciesAdvice.watering).toEqual({ summerDays: 7, winterDays: 14 });
    expect(speciesAdvice.safety.level).toBe('UNKNOWN');
    expect(speciesAdvice.safety.note).toBeNull();
  });

  it('requires authentication', async () => {
    const body = await harness.request<Advice>(QUERY, {
      species: 'Monstera deliciosa',
    });
    expect(body.errors).toBeDefined();
  });
});
