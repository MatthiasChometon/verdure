import { Injectable } from '@nestjs/common';

// First word of the species, lowercased; keys the safety/care-sheet/species-info catalogs.
// Mirrored in SQL by list/repository.ts's genusExpression — keep both in sync.
@Injectable()
export class PlantGenus {
  of(species: string): string {
    return species.trim().split(/\s+/)[0]?.toLowerCase() ?? '';
  }
}
