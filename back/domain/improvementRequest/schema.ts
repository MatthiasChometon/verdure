import { randomUUID } from 'node:crypto';
import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from '../user/schema';
import type { SuggestionContext } from './type';

// Sibling to bug_report (same shape), own table for its extra lifecycle
// (planned/shipped/set aside). Outlives the account (set null, not cascade).
export const improvementRequest = pgTable('improvement_request', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn((): string => randomUUID()),
  userId: uuid('user_id').references(() => user.id, { onDelete: 'set null' }),
  importance: text('importance').notNull(),
  message: text('message').notNull(),
  context: jsonb('context').$type<SuggestionContext>().notNull(),
  status: text('status').notNull().default('NEW'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
