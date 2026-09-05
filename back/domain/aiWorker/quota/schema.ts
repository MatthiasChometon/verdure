import { date, integer, pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core';

// Per-user, per-day count of SHARED-key identifications. Users with their own key are not counted here.
export const plantnetSharedUsage = pgTable(
  'plantnet_shared_usage',
  {
    userId: uuid('user_id').notNull(),
    day: date('day').notNull(),
    count: integer('count').notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.userId, table.day] })],
);
