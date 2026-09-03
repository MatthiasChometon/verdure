import { Injectable } from '@nestjs/common';
import { PlantGenus } from '../plant-genus';
import type { Localised } from '../type';
import { PLANT_SPECIES_INFO_CATALOG } from './catalog';
import { SpeciesInfo } from './model';

@Injectable()
export class PlantSpeciesInfoService {
  constructor(private readonly genus: PlantGenus) {}

  // The bio for a plant's species, in the requested language. An unrecognised
  // species has no curated bio — undefined, never invented.
  assess(species: string, lang: string): SpeciesInfo | undefined {
    const entry = PLANT_SPECIES_INFO_CATALOG[this.genus.of(species)];
    if (entry === undefined) {
      return undefined;
    }
    return {
      description: this.localise(entry.description, lang),
      origin: this.localise(entry.origin, lang),
    };
  }

  private localise(text: Localised, lang: string): string {
    return lang.toLowerCase().startsWith('fr') ? text.fr : text.en;
  }
}
