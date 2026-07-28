import { ArgsType, Field } from '@nestjs/graphql';
import { IsIsoDate } from '../../../infrastructure/validation/is-iso-date';

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
