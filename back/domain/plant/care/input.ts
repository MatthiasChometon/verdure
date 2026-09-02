import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { IsIsoDate } from '../../../infrastructure/validation/is-iso-date';
import { IsNotFuture } from '../../../infrastructure/validation/is-not-future';
import { CareConstraints } from './care-constraints';
import { CareType } from './enum';

// Create or update a plant's routine for one care type. Idempotent by
// (plant, careType): setting the same type again updates its interval.
@InputType()
export class SetCareScheduleInput {
  @Field(() => ID)
  @IsUUID()
  plantId: string;

  @Field(() => CareType)
  @IsEnum(CareType)
  careType: CareType;

  @Field(() => Int)
  @IsInt()
  @Min(CareConstraints.minIntervalDays)
  @Max(CareConstraints.maxIntervalDays)
  intervalDays: number;
}

// Mark a care task done. Defaults to today (server-side) when omitted; accepts a
// past date but never a future one — you can only log care that has happened.
@InputType()
export class LogCareInput {
  @Field(() => ID)
  @IsUUID()
  plantId: string;

  @Field(() => CareType)
  @IsEnum(CareType)
  careType: CareType;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsIsoDate()
  @IsNotFuture()
  doneOn?: string | null;
}

@InputType()
export class RemoveCareScheduleInput {
  @Field(() => ID)
  @IsUUID()
  plantId: string;

  @Field(() => CareType)
  @IsEnum(CareType)
  careType: CareType;
}
