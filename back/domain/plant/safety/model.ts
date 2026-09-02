import { Field, ObjectType } from '@nestjs/graphql';
import { PlantSafetyLevel } from './enum';

// Pet/child toxicity of a plant, resolved from its species. `note` is a short,
// already-localised sentence (a reason for toxic plants, a reassurance for safe
// ones), or null when the species is unrecognised.
@ObjectType()
export class PlantSafety {
  @Field(() => PlantSafetyLevel)
  level: PlantSafetyLevel;

  @Field(() => String, { nullable: true })
  note: string | null;
}
