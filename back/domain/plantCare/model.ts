import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { CareType } from './enum';

@ObjectType()
export class CareSchedule {
  @Field(() => ID)
  id: string;

  @Field(() => CareType)
  careType: CareType;

  @Field(() => Int)
  intervalDays: number;

  // ISO date (YYYY-MM-DD) the task was last done, null when never done.
  @Field(() => String, { nullable: true })
  lastDoneOn: string | null;

  // ISO date (YYYY-MM-DD) the task is next due, null while never done.
  @Field(() => String, { nullable: true })
  nextDueOn: string | null;
}
