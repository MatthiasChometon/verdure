import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Plant } from '../model';

@ObjectType()
export class PlantPage {
  @Field(() => [Plant])
  items: Plant[];

  @Field(() => Int)
  total: number;

  // True while the semantic vector is still pending from the worker; items are the keyword
  // fallback meanwhile — the front shows a hint and retries.
  @Field(() => Boolean)
  semanticPending: boolean;
}
