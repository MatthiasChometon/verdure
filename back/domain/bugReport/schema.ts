import { randomUUID } from 'node:crypto';
import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from '../user/schema';
import type { ReportContext } from './type';

// Outlives the account (set null, not cascade, on delete). context is jsonb —
// read as one block, never queried across, free to grow without a migration.
export const bugReport = pgTable('bug_report', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn((): string => randomUUID()),
  userId: uuid('user_id').references(() => user.id, { onDelete: 'set null' }),
  severity: text('severity').notNull(),
  message: text('message').notNull(),
  context: jsonb('context').$type<ReportContext>().notNull(),
  // An optional screenshot, stored like every other image — an opaque key the
  // API serves back. Null when nothing was attached, which is most reports.
  imageKey: text('image_key'),
  status: text('status').notNull().default('NEW'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Own table, not a column on the account: this slice owns who may report, and
// a row here only silences reporting — not a site ban, plants/account untouched.
export const reportBlock = pgTable('report_block', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  blockedAt: timestamp('blocked_at').notNull().defaultNow(),
});
