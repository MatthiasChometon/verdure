import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../../infrastructure/database/token';
import type { PushSubscriptionRecord } from '../../infrastructure/push/type';
import { PushSubscriptionInput } from './input';
import { pushSubscription } from './schema';

@Injectable()
export class PushSubscriptionRepository {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  // Idempotent by endpoint: re-subscribing (or a different user on the same
  // browser) updates the existing row's owner instead of duplicating it.
  async subscribe(userId: string, input: PushSubscriptionInput): Promise<void> {
    await this.database
      .insert(pushSubscription)
      .values({
        userId,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
      })
      .onConflictDoUpdate({
        target: pushSubscription.endpoint,
        set: { userId, p256dh: input.p256dh, auth: input.auth },
      });
  }

  // Only the owner can remove their own subscription (guarded to the user).
  async unsubscribe(userId: string, endpoint: string): Promise<boolean> {
    const [deleted] = await this.database
      .delete(pushSubscription)
      .where(
        and(
          eq(pushSubscription.endpoint, endpoint),
          eq(pushSubscription.userId, userId),
        ),
      )
      .returning({ id: pushSubscription.id });
    return deleted !== undefined;
  }

  findByUser(userId: string): Promise<PushSubscriptionRecord[]> {
    return this.database
      .select({
        endpoint: pushSubscription.endpoint,
        p256dh: pushSubscription.p256dh,
        auth: pushSubscription.auth,
      })
      .from(pushSubscription)
      .where(eq(pushSubscription.userId, userId));
  }

  // The distinct users who have at least one subscription — the only ones the
  // reminder scheduler needs to look at.
  async subscribedUserIds(): Promise<string[]> {
    const rows = await this.database
      .selectDistinct({ userId: pushSubscription.userId })
      .from(pushSubscription);
    return rows.map((row) => row.userId);
  }

  // Prune a subscription the push service reported as gone (410/404). Not
  // scoped to a user: the endpoint is dead for everyone.
  async deleteByEndpoint(endpoint: string): Promise<void> {
    await this.database
      .delete(pushSubscription)
      .where(eq(pushSubscription.endpoint, endpoint));
  }
}
