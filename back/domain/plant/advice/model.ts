import { Field, ObjectType } from '@nestjs/graphql';
import { PlantSafety } from '../safety/model';
import { WateringDefault } from '../watering/default.model';

// The advice the add form shows the instant a species is identified or picked:
// its suggested seasonal watering rhythm and its pet/child toxicity, in one call.
@ObjectType()
export class SpeciesAdvice {
  @Field(() => WateringDefault)
  watering: WateringDefault;

  @Field(() => PlantSafety)
  safety: PlantSafety;
}
