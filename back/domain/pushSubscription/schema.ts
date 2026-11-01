import { randomUUID } from 'node:crypto';
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// One Web Push subscription per browser, owned by a user. `endpoint` is unique
// so re-subscribing upserts and re-assigns ownership rather than duplicating.
export const pushSubscription = pgTable(
  'push_subscription',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: uuid('user_id').notNull(),
    endpoint: text('endpoint').notNull().unique(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  // The reminder round reads every device of each user.
  (table) => [index('push_subscription_user_id_idx').on(table.userId)],
);
