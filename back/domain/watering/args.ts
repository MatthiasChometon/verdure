import { ArgsType, Field, ID } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { IsIsoDate } from '../../infrastructure/validation/is-iso-date';

@ArgsType()
export class WateringEventsArgs {
  // Inclusive ISO date range (YYYY-MM-DD) for the calendar view.
  @Field()
  @IsIsoDate()
  from: string;

  @Field()
  @IsIsoDate()
  to: string;

  // Only this plant's waterings (the plant page's calendar), instead of the whole collection's.
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  plantId?: string;
}

@ArgsType()
export class WateringDefaultArgs {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  species: string;
}
