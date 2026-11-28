import { Injectable } from '@nestjs/common';
import { PlantGenus } from '../../plant/genus';
import { entryOf, localise } from '../lookup';
import { PLANT_CARE_CATALOG } from './catalog';
import { PlantCareSheet } from './model';

@Injectable()
export class PlantCareSheetService {
  constructor(private readonly genus: PlantGenus) {}

  // The care sheet for a plant's species, with its tip in the requested language.
  // An unrecognised species has no curated sheet — undefined, never invented.
  assess(species: string, lang: string): PlantCareSheet | undefined {
    const entry = entryOf(PLANT_CARE_CATALOG, this.genus.of(species));
    if (entry === undefined) {
      return undefined;
    }
    return {
      light: entry.light,
      humidity: entry.humidity,
      tip: localise(entry.tip, lang),
    };
  }
}
