import { Injectable } from '@nestjs/common';
import { TaxonomyService } from '../../infrastructure/taxonomy/service';
import { SpeciesRepository } from './repository';

// Turns a raw vision-model guess into a canonical "Genus species" name: match
// the local index, fall back to GBIF, else the cleaned binomial.
@Injectable()
export class SpeciesReconciler {
  constructor(
    private readonly speciesRepository: SpeciesRepository,
    private readonly gbif: TaxonomyService,
  ) {}

  async reconcile(guess: string): Promise<string | null> {
    const binomial = guess
      .replace(/[^\p{L}\s]/gu, ' ')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .join(' ');
    if (binomial === '') {
      return null;
    }

    const local = await this.speciesRepository.match(binomial);
    if (local !== undefined) {
      return local;
    }
    const [fallback] = await this.gbif.suggest(binomial);
    return fallback?.name ?? binomial;
  }
}
