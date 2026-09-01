import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../auth/currentUser/current-user';
import { AuthGuard } from '../auth/currentUser/guard';
import { WebPushService } from '../../infrastructure/push/service';
import { User } from '../user/model';
import { PushSubscriptionInput } from './input';
import { PushSubscriptionRepository } from './repository';

@Resolver()
export class PushSubscriptionResolver {
  constructor(
    private readonly repository: PushSubscriptionRepository,
    private readonly webPush: WebPushService,
  ) {}

  // Public: the browser needs this application server key to create a push
  // subscription. Null when push is not configured, so the front hides the
  // reminders toggle instead of offering something that can only fail.
  @Query(() => String, { nullable: true })
  webPushPublicKey(): string | null {
    return this.webPush.vapidPublicKey();
  }

  // Store the caller's own browser subscription. Refuses (false) when push is
  // not configured server-side. Guarded to the current user.
  @Mutation(() => Boolean)
  @UseGuards(AuthGuard)
  async subscribeToPush(
    @CurrentUser() user: User,
    @Args('input') input: PushSubscriptionInput,
  ): Promise<boolean> {
    if (!this.webPush.isConfigured()) {
      return false;
    }
    await this.repository.subscribe(user.id, input);
    return true;
  }

  // Remove one of the caller's own subscriptions (this device). Guarded to the
  // current user so nobody can delete another user's subscription.
  @Mutation(() => Boolean)
  @UseGuards(AuthGuard)
  unsubscribeFromPush(
    @CurrentUser() user: User,
    @Args('endpoint', { type: () => String }) endpoint: string,
  ): Promise<boolean> {
    return this.repository.unsubscribe(user.id, endpoint);
  }
}
