import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class GenusFacet {
  @Field()
  value: string;

  @Field(() => Int)
  count: number;
}

@ObjectType()
export class PlantFacets {
  @Field(() => [GenusFacet])
  genera: GenusFacet[];

  @Field(() => Int)
  withImage: number;

  @Field(() => Int)
  withoutImage: number;
}
