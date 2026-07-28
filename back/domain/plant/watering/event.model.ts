import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class WateringEvent {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  plantId: string;

  @Field()
  plantName: string;

  // ISO date (YYYY-MM-DD) the plant was watered.
  @Field()
  wateredOn: string;
}
