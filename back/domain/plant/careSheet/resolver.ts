import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Plant } from '../model';
import { PlantCareSheet } from './model';
import { PlantCareSheetService } from './service';

@Resolver(() => Plant)
export class CareSheetResolver {
  constructor(private readonly service: PlantCareSheetService) {}

  // Resolved in memory — no extra round-trip. Nullable: an unrecognised species has no sheet.
  @ResolveField(() => PlantCareSheet, { nullable: true })
  careSheet(
    @Parent() plant: Plant,
    @Args('lang', { type: () => String, nullable: true }) lang: string | null,
  ): PlantCareSheet | undefined {
    return this.service.assess(plant.species, lang ?? 'en');
  }
}
