import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// The browser's PushSubscription, serialised. Every field needs a validator,
// else ValidationPipe's whitelist silently strips it to undefined.
@InputType()
export class PushSubscriptionInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  endpoint: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  p256dh: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  auth: string;
}
