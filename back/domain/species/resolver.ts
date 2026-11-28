import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { AuthGuard } from '../auth/currentUser/guard';
import { SpeciesSuggestionsArgs } from './args';
import { SpeciesSuggestion } from './model';
import { SpeciesSuggestionService } from './suggestion-service';

@Resolver(() => SpeciesSuggestion)
export class SpeciesResolver {
  constructor(private readonly suggestions: SpeciesSuggestionService) {}

  @Query(() => [SpeciesSuggestion])
  @UseGuards(AuthGuard)
  speciesSuggestions(
    @Args() { search }: SpeciesSuggestionsArgs,
  ): Promise<SpeciesSuggestion[]> {
    return this.suggestions.suggest(search);
  }
}
