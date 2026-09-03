import { Injectable } from '@nestjs/common';
import { PlantGenus } from '../plant-genus';
import { type CareEntry, PLANT_CARE_CATALOG } from './catalog';
import { PlantCareSheet } from './model';

@Injectable()
export class PlantCareSheetService {
  constructor(private readonly genus: PlantGenus) {}

  // The care sheet for a plant's species, with its tip in the requested language.
  // An unrecognised species has no curated sheet — undefined, never invented.
  assess(species: string, lang: string): PlantCareSheet | undefined {
    const entry = PLANT_CARE_CATALOG[this.genus.of(species)];
    if (entry === undefined) {
      return undefined;
    }
    return {
      light: entry.light,
      humidity: entry.humidity,
      tip: this.tipFor(entry, lang),
    };
  }

  private tipFor(entry: CareEntry, lang: string): string {
    return lang.toLowerCase().startsWith('fr') ? entry.tip.fr : entry.tip.en;
  }
}
