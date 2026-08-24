import { Field, ObjectType } from '@nestjs/graphql';

// A device asking to be paired, shown on the approval screen so the user can see
// what they are about to grant AI access to.
@ObjectType()
export class PairingRequest {
  @Field()
  code: string;

  @Field(() => String, { nullable: true })
  label: string | null;
}
