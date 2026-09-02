import { Injectable } from '@nestjs/common';
import { PLANT_SAFETY_CATALOG, type SafetyEntry } from './catalog';
import { PlantSafetyLevel } from './enum';
import { PlantSafety } from './model';

@Injectable()
export class PlantSafetyService {
  // Toxicity of a plant's species, with a short note in the requested language.
  // An unrecognised species is UNKNOWN — honest, never assumed safe.
  assess(species: string, lang: string): PlantSafety {
    const entry = PLANT_SAFETY_CATALOG[this.genusOf(species)];
    if (entry === undefined) {
      return { level: PlantSafetyLevel.UNKNOWN, note: null };
    }
    return { level: entry.level, note: this.noteFor(entry, lang) };
  }

  // Genera the badge filter treats as pet-safe, lowercased to match the list's
  // genus expression (`lower(split_part(species, ' ', 1))`).
  safeGenera(): string[] {
    return Object.entries(PLANT_SAFETY_CATALOG)
      .filter(([, entry]) => entry.level === PlantSafetyLevel.SAFE)
      .map(([genus]) => genus);
  }

  private genusOf(species: string): string {
    return species.trim().split(/\s+/)[0]?.toLowerCase() ?? '';
  }

  private noteFor(entry: SafetyEntry, lang: string): string {
    return lang.toLowerCase().startsWith('fr') ? entry.note.fr : entry.note.en;
  }
}
