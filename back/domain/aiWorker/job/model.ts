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
}
