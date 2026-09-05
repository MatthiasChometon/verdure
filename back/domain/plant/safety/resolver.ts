import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Plant } from '../model';
import { PlantSafety } from './model';
import { PlantSafetyService } from './service';

@Resolver(() => Plant)
export class SafetyResolver {
  constructor(private readonly service: PlantSafetyService) {}

  // Resolved in memory — no extra round-trip.
  @ResolveField(() => PlantSafety, { nullable: true })
  safety(
    @Parent() plant: Plant,
    @Args('lang', { type: () => String, nullable: true }) lang: string | null,
  ): PlantSafety {
    return this.service.assess(plant.species, lang ?? 'en');
  }
}
