import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class User {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field()
  name: string;

  @Field(() => String, { nullable: true })
  avatarUrl: string | null;

  // Whether the user has set their own Pl@ntNet key. The key itself is never
  // exposed over the API — only whether one is configured.
  @Field(() => Boolean)
  hasPlantnetKey: boolean;
}
