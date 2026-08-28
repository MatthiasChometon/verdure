import { Field, ID, ObjectType } from '@nestjs/graphql';
import { RecognitionStatus } from './enum';

@ObjectType()
export class RecognitionJob {
  @Field(() => ID)
  id: string;

  @Field(() => RecognitionStatus)
  status: RecognitionStatus;

  // The recognised species once the job is done, else null.
  @Field(() => String, { nullable: true })
  species: string | null;

  // Why a failed job failed, when it helps the user act: 'quota' (Pl@ntNet key
  // exhausted/unavailable) or 'limit' (shared-key daily cap reached); else null.
  @Field(() => String, { nullable: true })
  failReason: string | null;
}
