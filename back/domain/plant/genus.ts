import { Injectable } from '@nestjs/common';

// First word of the species, lowercased; keys the safety/care-sheet/species-info catalogs.
// Mirrored in SQL by list/repository.ts's genusExpression — keep both in sync.
@Injectable()
export class PlantGenus {
  // '' for a blank (or absent) species: the generic bucket.
  of(species: string | null | undefined): string {
    if (species === null || species === undefined) {
      return '';
    }
    return species.trim().split(/\s+/)[0]?.toLowerCase() ?? '';
  }
}
