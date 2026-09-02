import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Plant } from '../model';
import { PlantSafety } from './model';
import { PlantSafetyService } from './service';

@Resolver(() => Plant)
export class SafetyResolver {
  constructor(private readonly service: PlantSafetyService) {}

  // Resolved in memory from the species — no extra round-trip. `lang` localises
  // the note; it defaults to English when the client does not pass one. Nullable
  // so a client that never selects it does not force the field into every shape.
  @ResolveField(() => PlantSafety, { nullable: true })
  safety(
    @Parent() plant: Plant,
    @Args('lang', { type: () => String, nullable: true }) lang: string | null,
  ): PlantSafety {
    return this.service.assess(plant.species, lang ?? 'en');
  }
}
