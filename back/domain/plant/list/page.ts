import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Plant } from '../model';

@ObjectType()
export class PlantPage {
  @Field(() => [Plant])
  items: Plant[];

  @Field(() => Int)
  total: number;

  // Semantic search asked its vector from the user's worker (async) and it isn't
  // ready yet: these items are the keyword fallback for now. The front shows a
  // hint and retries so the semantic ranking lands once the worker answers.
  @Field(() => Boolean)
  semanticPending: boolean;
}
