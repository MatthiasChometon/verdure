import { Injectable } from '@nestjs/common';
import { type CareEntry, PLANT_CARE_CATALOG } from './catalog';
import { PlantCareSheet } from './model';

@Injectable()
export class PlantCareSheetService {
  // The care sheet for a plant's species, with its tip in the requested language.
  // An unrecognised species has no curated sheet — undefined, never invented.
  assess(species: string, lang: string): PlantCareSheet | undefined {
    const entry = PLANT_CARE_CATALOG[this.genusOf(species)];
    if (entry === undefined) {
      return undefined;
    }
    return { light: entry.light, humidity: entry.humidity, tip: this.tipFor(entry, lang) };
  }

  private genusOf(species: string): string {
    return species.trim().split(/\s+/)[0]?.toLowerCase() ?? '';
  }

  private tipFor(entry: CareEntry, lang: string): string {
    return lang.toLowerCase().startsWith('fr') ? entry.tip.fr : entry.tip.en;
  }
}
