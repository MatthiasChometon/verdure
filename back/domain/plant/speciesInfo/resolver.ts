import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Plant } from '../model';
import { SpeciesInfo } from './model';
import { PlantSpeciesInfoService } from './service';

@Resolver(() => Plant)
export class SpeciesInfoResolver {
  constructor(private readonly service: PlantSpeciesInfoService) {}

  // Resolved in memory from the species — no extra round-trip. `lang` localises
  // the bio; it defaults to English when the client does not pass one. Nullable:
  // an unrecognised species simply has no curated bio.
  @ResolveField(() => SpeciesInfo, { nullable: true })
  speciesInfo(
    @Parent() plant: Plant,
    @Args('lang', { type: () => String, nullable: true }) lang: string | null,
  ): SpeciesInfo | undefined {
    return this.service.assess(plant.species, lang ?? 'en');
  }
}
