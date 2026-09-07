import { Field, ObjectType } from '@nestjs/graphql';
import { PlantSafetyLevel } from './enum';

// `note` is a short localised sentence, or null when the species is unrecognised.
@ObjectType()
export class PlantSafety {
  @Field(() => PlantSafetyLevel)
  level: PlantSafetyLevel;

  @Field(() => String, { nullable: true })
  note: string | null;
}
