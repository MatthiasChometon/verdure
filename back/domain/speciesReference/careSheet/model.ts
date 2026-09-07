import { Field, ObjectType } from '@nestjs/graphql';
import { PlantHumidityNeed, PlantLightNeed } from './enum';

// Resolved from the species; returned only for curated houseplants.
@ObjectType()
export class PlantCareSheet {
  @Field(() => PlantLightNeed)
  light: PlantLightNeed;

  @Field(() => PlantHumidityNeed)
  humidity: PlantHumidityNeed;

  @Field(() => String)
  tip: string;
}
