import { describe, expect, it } from 'vitest';
import { PlantSafetyLevel } from './enum';
import { PlantSafetyService } from './service';

const service = new PlantSafetyService();

describe('PlantSafetyService.assess', () => {
  it('flags a known toxic genus with a localised reason', () => {
    const fr = service.assess('Monstera deliciosa', 'fr');
    expect(fr.level).toBe(PlantSafetyLevel.TOXIC);
    expect(fr.note).toMatch(/oxalate/i);

    const en = service.assess('Monstera deliciosa', 'en');
    expect(en.level).toBe(PlantSafetyLevel.TOXIC);
    expect(en.note).toMatch(/oxalate/i);
    expect(en.note).not.toBe(fr.note);
  });

  it('marks a known non-toxic genus as safe', () => {
    const result = service.assess('Chlorophytum comosum', 'en');
    expect(result.level).toBe(PlantSafetyLevel.SAFE);
    expect(result.note).not.toBeNull();
  });

  it('returns UNKNOWN with no note for an unrecognised species', () => {
    const result = service.assess('Quercus robur', 'fr');
    expect(result.level).toBe(PlantSafetyLevel.UNKNOWN);
    expect(result.note).toBeNull();
  });

  it('matches the genus regardless of case or extra whitespace', () => {
    expect(service.assess('  philodendron   HEDERACEUM ', 'en').level).toBe(
      PlantSafetyLevel.TOXIC,
    );
  });

  it('resolves a bare genus with no species epithet', () => {
    expect(service.assess('Calathea', 'en').level).toBe(PlantSafetyLevel.SAFE);
  });

  it('defaults an unknown language to English', () => {
    expect(service.assess('Monstera deliciosa', 'de').note).toBe(
      service.assess('Monstera deliciosa', 'en').note,
    );
  });
});

describe('PlantSafetyService.safeGenera', () => {
  it('lists only safe genera, lowercased', () => {
    const genera = service.safeGenera();
    expect(genera).toContain('chlorophytum');
    expect(genera).not.toContain('monstera');
    expect(genera.every((genus) => genus === genus.toLowerCase())).toBe(true);
  });
});
