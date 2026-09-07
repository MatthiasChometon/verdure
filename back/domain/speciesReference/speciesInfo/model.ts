import { Field, ObjectType } from '@nestjs/graphql';

// Resolved from the species; returned only for curated houseplants.
@ObjectType()
export class SpeciesInfo {
  @Field(() => String)
  description: string;

  @Field(() => String)
  origin: string;
}
