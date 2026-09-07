import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class WateringDefault {
  @Field(() => Int)
  summerDays: number;

  @Field(() => Int)
  winterDays: number;
}
