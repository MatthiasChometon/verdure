import { Field, ID, ObjectType } from '@nestjs/graphql';
import { RecognitionStatus } from '../job/enum';

// A plant-health diagnosis job, as the detail page reads it while polling.
// Mirrors RecognitionJob but carries the free-text assessment instead of a
// species.
@ObjectType()
export class DiagnosisJob {
  @Field(() => ID)
  id: string;

  @Field(() => RecognitionStatus)
  status: RecognitionStatus;

  // The worker's free-text health assessment (probable causes + care advice)
  // once the job is done, else null.
  @Field(() => String, { nullable: true })
  diagnosis: string | null;

  // Why a failed diagnosis failed, when it helps the user act; else null.
  @Field(() => String, { nullable: true })
  failReason: string | null;
}
