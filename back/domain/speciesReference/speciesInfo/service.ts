import { Injectable } from '@nestjs/common';
import { PlantGenus } from '../../plant/genus';
import { entryOf, localise } from '../lookup';
import { PLANT_SPECIES_INFO_CATALOG } from './catalog';
import { SpeciesInfo } from './model';

@Injectable()
export class PlantSpeciesInfoService {
  constructor(private readonly genus: PlantGenus) {}

  // The bio for a plant's species, in the requested language. An unrecognised
  // species has no curated bio — undefined, never invented.
  assess(species: string, lang: string): SpeciesInfo | undefined {
    const entry = entryOf(PLANT_SPECIES_INFO_CATALOG, this.genus.of(species));
    if (entry === undefined) {
      return undefined;
    }
    return {
      description: localise(entry.description, lang),
      origin: localise(entry.origin, lang),
    };
  }
}
