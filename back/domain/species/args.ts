import { ArgsType, Field } from '@nestjs/graphql';
import { IsString, MaxLength } from 'class-validator';

@ArgsType()
export class SpeciesSuggestionsArgs {
  @Field(() => String)
  @IsString()
  @MaxLength(100)
  search!: string;
}
