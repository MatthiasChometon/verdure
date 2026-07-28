import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SpeciesSuggestion {
  @Field()
  name: string;
}
