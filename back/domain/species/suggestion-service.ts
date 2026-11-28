import { Injectable } from '@nestjs/common';
import { TaxonomyService } from '../../infrastructure/taxonomy/service';
import { SpeciesSuggestion } from './model';
import { SpeciesRepository } from './repository';

const MIN_TERM_LENGTH = 2;
const MAX_SUGGESTIONS = 10;

@Injectable()
export class SpeciesSuggestionService {
  constructor(
    private readonly repository: SpeciesRepository,
    private readonly gbif: TaxonomyService,
  ) {}

  async suggest(search: string): Promise<SpeciesSuggestion[]> {
    const term = search.trim();
    if (term.length < MIN_TERM_LENGTH) {
      return [];
    }

    // The local index answers instantly and typo-tolerantly; only an empty
    // result falls back to a live GBIF lookup, caching what we learn.
    const local = await this.repository.search(term, MAX_SUGGESTIONS);
    if (local.length > 0) {
      return local.map((entry) => ({ name: entry.name }));
    }

    const fresh = await this.gbif.suggest(term);
    await this.repository.cache(fresh);
    return fresh
      .slice(0, MAX_SUGGESTIONS)
      .map((entry) => ({ name: entry.name }));
  }
}
