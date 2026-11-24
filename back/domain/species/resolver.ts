import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { TaxonomyService } from '../../infrastructure/taxonomy/service';
import { AuthGuard } from '../auth/currentUser/guard';
import { SpeciesSuggestion } from './model';
import { SpeciesRepository } from './repository';

@Resolver(() => SpeciesSuggestion)
export class SpeciesResolver {
  constructor(
    private readonly repository: SpeciesRepository,
    private readonly gbif: TaxonomyService,
  ) {}

  @Query(() => [SpeciesSuggestion])
  @UseGuards(AuthGuard)
  async speciesSuggestions(
    @Args('search') search: string,
  ): Promise<SpeciesSuggestion[]> {
    const term = search.trim();
    if (term.length < 2) {
      return [];
    }

    // The local index answers instantly and typo-tolerantly; only an empty
    // result falls back to a live GBIF lookup, caching what we learn.
    const local = await this.repository.search(term, 10);
    if (local.length > 0) {
      return local.map((entry) => ({ name: entry.name }));
    }

    const fresh = await this.gbif.suggest(term);
    await this.repository.cache(fresh);
    return fresh.slice(0, 10).map((entry) => ({ name: entry.name }));
  }
}
