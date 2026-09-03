import { Field, ObjectType } from '@nestjs/graphql';

// A short biography of a plant, resolved from its species: a rich description of
// what it is and its character, plus where it comes from. Both are already
// localised. Returned only for the curated common houseplants; an unrecognised
// species gets no bio.
@ObjectType()
export class SpeciesInfo {
  @Field(() => String)
  description: string;

  @Field(() => String)
  origin: string;
}
