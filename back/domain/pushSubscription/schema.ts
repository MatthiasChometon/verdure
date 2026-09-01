import { randomUUID } from 'node:crypto';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// One Web Push subscription per browser/device, owned by a user. `endpoint` is
// unique (it identifies the browser's push channel): re-subscribing the same
// browser upserts onto the existing row rather than piling up duplicates, and
// re-assigns it to whoever is signed in now. Deleted when the user turns
// reminders off or when the push service reports the endpoint gone (410).
export const pushSubscription = pgTable('push_subscription', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: uuid('user_id').notNull(),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
