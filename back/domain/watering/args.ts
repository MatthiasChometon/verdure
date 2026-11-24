import { ArgsType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
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
}

@ArgsType()
export class WateringDefaultArgs {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  species: string;
}
