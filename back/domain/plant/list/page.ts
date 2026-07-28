import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Plant } from '../model';

@ObjectType()
export class PlantPage {
  @Field(() => [Plant])
  items: Plant[];

  @Field(() => Int)
  total: number;
}
