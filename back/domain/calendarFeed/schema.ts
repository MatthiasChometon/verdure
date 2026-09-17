import { randomUUID } from 'node:crypto';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// One persistent, non-expiring secret per user: the sole gate on the public
// ICS feed endpoint (no session cookie — calendar apps fetch it on their own
// schedule). Stored raw, not hashed, since it must be re-displayed to the
// user whenever they revisit their settings (a new device to subscribe) —
// same threat model as the file-storage image keys, not a login credential.
export const calendarFeedToken = pgTable('calendar_feed_token', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: uuid('user_id').notNull().unique(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
