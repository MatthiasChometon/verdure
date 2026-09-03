import { describe, expect, it } from 'vitest';
import { PlantSpeciesInfoService } from './service';

const service = new PlantSpeciesInfoService();

describe('PlantSpeciesInfoService.assess', () => {
  it('returns a localised description and origin for a known genus', () => {
    const fr = service.assess('Monstera deliciosa', 'fr');
    expect(fr?.description).toMatch(/liane/i);
    expect(fr?.origin).toMatch(/Mexique/i);

    const en = service.assess('Monstera deliciosa', 'en');
    expect(en?.description).toMatch(/rainforest/i);
    expect(en?.origin).toMatch(/Mexico/i);
    expect(en?.description).not.toBe(fr?.description);
  });

  it('returns undefined for a species with no curated bio', () => {
    expect(service.assess('Quercus robur', 'fr')).toBeUndefined();
  });

  it('matches the genus regardless of case or extra whitespace', () => {
    expect(
      service.assess('  philodendron   HEDERACEUM ', 'en')?.origin,
    ).toMatch(/America/i);
  });

  it('resolves a bare genus with no species epithet', () => {
    expect(service.assess('Calathea', 'en')?.description).toMatch(
      /prayer plant/i,
    );
  });

  it('defaults an unknown language to English', () => {
    expect(service.assess('Monstera deliciosa', 'de')?.description).toBe(
      service.assess('Monstera deliciosa', 'en')?.description,
    );
  });
});
