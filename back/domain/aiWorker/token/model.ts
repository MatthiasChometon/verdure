import { Field, ID, ObjectType } from '@nestjs/graphql';

// A registered worker as shown in the "Activate AI" screen.
@ObjectType()
export class WorkerToken {
  @Field(() => ID)
  id: string;

  @Field(() => String, { nullable: true })
  label: string | null;

  // Whether this worker has phoned home recently (online right now).
  @Field()
  online: boolean;

  // ISO timestamp of the last contact, or null if it never connected.
  @Field(() => String, { nullable: true })
  lastSeenAt: string | null;
}

// Returned once when a token is created — carries the plaintext to paste into
// the worker installer. It is never retrievable again.
@ObjectType()
export class IssuedWorkerToken {
  @Field(() => ID)
  id: string;

  @Field(() => String, { nullable: true })
  label: string | null;

  @Field()
  token: string;
}
