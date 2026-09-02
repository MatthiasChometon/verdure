import { describe, expect, it } from 'vitest';
import { PlantHumidityNeed, PlantLightNeed } from './enum';
import { PlantCareSheetService } from './service';

const service = new PlantCareSheetService();

describe('PlantCareSheetService.assess', () => {
  it('returns light, humidity and a localised tip for a known genus', () => {
    const fr = service.assess('Monstera deliciosa', 'fr');
    expect(fr?.light).toBe(PlantLightNeed.MEDIUM);
    expect(fr?.humidity).toBe(PlantHumidityNeed.HIGH);
    expect(fr?.tip).toMatch(/tuteur/i);

    const en = service.assess('Monstera deliciosa', 'en');
    expect(en?.tip).toMatch(/moss pole/i);
    expect(en?.tip).not.toBe(fr?.tip);
  });

  it('gives a succulent low humidity and bright light', () => {
    const result = service.assess('Echeveria elegans', 'en');
    expect(result?.light).toBe(PlantLightNeed.BRIGHT);
    expect(result?.humidity).toBe(PlantHumidityNeed.LOW);
  });

  it('returns undefined for a species with no curated sheet', () => {
    expect(service.assess('Quercus robur', 'fr')).toBeUndefined();
  });

  it('matches the genus regardless of case or extra whitespace', () => {
    expect(service.assess('  philodendron   HEDERACEUM ', 'en')?.light).toBe(
      PlantLightNeed.MEDIUM,
    );
  });

  it('resolves a bare genus with no species epithet', () => {
    expect(service.assess('Calathea', 'en')?.humidity).toBe(PlantHumidityNeed.HIGH);
  });

  it('defaults an unknown language to English', () => {
    expect(service.assess('Monstera deliciosa', 'de')?.tip).toBe(
      service.assess('Monstera deliciosa', 'en')?.tip,
    );
  });
});
