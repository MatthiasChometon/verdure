import { Field, ObjectType } from '@nestjs/graphql';
import { PlantHumidityNeed, PlantLightNeed } from './enum';

// A compact care sheet for a plant, resolved from its species: how much light
// and humidity it wants, plus one short, already-localised growing tip. Returned
// only for the curated common houseplants; unrecognised species get no sheet.
@ObjectType()
export class PlantCareSheet {
  @Field(() => PlantLightNeed)
  light: PlantLightNeed;

  @Field(() => PlantHumidityNeed)
  humidity: PlantHumidityNeed;

  @Field(() => String)
  tip: string;
}
