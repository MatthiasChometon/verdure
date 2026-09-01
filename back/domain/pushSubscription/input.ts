import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// The browser's PushSubscription, serialised: the endpoint URL plus the two
// keys web-push needs to encrypt for it. Every field carries a validator so the
// whitelist does not silently strip it (an undeclared field becomes undefined).
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
