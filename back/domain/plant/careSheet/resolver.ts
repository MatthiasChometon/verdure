import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Plant } from '../model';
import { PlantCareSheet } from './model';
import { PlantCareSheetService } from './service';

@Resolver(() => Plant)
export class CareSheetResolver {
  constructor(private readonly service: PlantCareSheetService) {}

  // Resolved in memory from the species — no extra round-trip. `lang` localises
  // the tip; it defaults to English when the client does not pass one. Nullable:
  // an unrecognised species simply has no curated sheet.
  @ResolveField(() => PlantCareSheet, { nullable: true })
  careSheet(
    @Parent() plant: Plant,
    @Args('lang', { type: () => String, nullable: true }) lang: string | null,
  ): PlantCareSheet | undefined {
    return this.service.assess(plant.species, lang ?? 'en');
  }
}
