import { Injectable } from '@nestjs/common';

// Genus of a plant's species: its first word, lowercased ("Monstera deliciosa"
// -> "monstera"). Used to look up the safety/care-sheet/species-info catalogs
// and the watering defaults table, all keyed by genus. Mirrored in SQL by the
// list's genusExpression (see list/repository.ts) for filtering/faceting at
// the database.
@Injectable()
export class PlantGenus {
  of(species: string): string {
    return species.trim().split(/\s+/)[0]?.toLowerCase() ?? '';
  }
}
