import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { AuthGuard } from '../../auth/currentUser/guard';
import { PlantSafetyService } from '../safety/service';
import { WateringRepository } from '../watering/repository';
import { SpeciesAdvice } from './model';

@Resolver()
export class AdviceResolver {
  constructor(
    private readonly watering: WateringRepository,
    private readonly safety: PlantSafetyService,
  ) {}

  // One round-trip for the add form: the suggested watering rhythm and the
  // toxicity of a species, so everything fills in the moment a species is chosen.
  // `lang` localises the safety note; it defaults to English when omitted.
  @Query(() => SpeciesAdvice)
  @UseGuards(AuthGuard)
  async speciesAdvice(
    @Args('species', { type: () => String }) species: string,
    @Args('lang', { type: () => String, nullable: true }) lang: string | null,
  ): Promise<SpeciesAdvice> {
    const watering = await this.watering.wateringDefault(species);
    return { watering, safety: this.safety.assess(species, lang ?? 'en') };
  }
}
