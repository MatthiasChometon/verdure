import { Field, ID, InputType } from '@nestjs/graphql';
import { IsOptional, IsUUID } from 'class-validator';
import { IsIsoDate } from '../../../infrastructure/validation/is-iso-date';
import { IsNotFuture } from '../../../infrastructure/validation/is-not-future';

@InputType()
export class WaterPlantInput {
  @Field(() => ID)
  @IsUUID()
  plantId: string;

  // Defaults to today (server-side) when omitted; accepts a past date but never
  // a future one — you can only log a watering that has actually happened.
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsIsoDate()
  @IsNotFuture()
  wateredOn?: string | null;
}
