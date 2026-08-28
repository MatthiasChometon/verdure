import { date, integer, pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core';

// Per-user, per-day count of identifications that used the SHARED Pl@ntNet key,
// so one user can't drain the shared free quota (or spam it) for everyone. Users
// who added their own key are not counted here — they spend their own quota.
export const plantnetSharedUsage = pgTable(
  'plantnet_shared_usage',
  {
    userId: uuid('user_id').notNull(),
    day: date('day').notNull(),
    count: integer('count').notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.userId, table.day] })],
);
