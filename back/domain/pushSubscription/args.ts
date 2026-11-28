import { ArgsType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

@ArgsType()
export class UnsubscribeFromPushArgs {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  endpoint: string;
}
