import { Injectable } from '@nestjs/common';
import { type LocalisedText, PLANT_SPECIES_INFO_CATALOG } from './catalog';
import { SpeciesInfo } from './model';

@Injectable()
export class PlantSpeciesInfoService {
  // The bio for a plant's species, in the requested language. An unrecognised
  // species has no curated bio — undefined, never invented.
  assess(species: string, lang: string): SpeciesInfo | undefined {
    const entry = PLANT_SPECIES_INFO_CATALOG[this.genusOf(species)];
    if (entry === undefined) {
      return undefined;
    }
    return {
      description: this.localise(entry.description, lang),
      origin: this.localise(entry.origin, lang),
    };
  }

  private genusOf(species: string): string {
    return species.trim().split(/\s+/)[0]?.toLowerCase() ?? '';
  }

  private localise(text: LocalisedText, lang: string): string {
    return lang.toLowerCase().startsWith('fr') ? text.fr : text.en;
  }
}
