import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Plant {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field()
  species: string;

  @Field(() => String, { nullable: true })
  description: string | null;

  imageKey: string | null;

  @Field(() => Int, { nullable: true })
  wateringIntervalSummerDays: number | null;

  @Field(() => Int, { nullable: true })
  wateringIntervalWinterDays: number | null;

  // ISO date (YYYY-MM-DD) of the most recent watering, null if never watered.
  @Field(() => String, { nullable: true })
  lastWateredOn: string | null;

  // ISO date (YYYY-MM-DD) when the plant is next due, null when not tracked.
  @Field(() => String, { nullable: true })
  nextDueOn: string | null;

  // True when the plant is currently in winter dormancy (deep-winter months) and
  // tracked for winter — its watering rhythm is deliberately slowed.
  @Field()
  winterRest: boolean;
}
