import { randomUUID } from 'node:crypto';
import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

// Per-user worker credential; only the SHA-256 hash is stored, plaintext shown once.
// `lastSeenAt` bumps on every authenticated call and drives the "is a worker online?" check.
export const workerToken = pgTable(
  'worker_token',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: uuid('user_id').notNull(),
    tokenHash: text('token_hash').notNull(),
    label: text('label'),
    lastSeenAt: timestamp('last_seen_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('worker_token_hash_unique').on(table.tokenHash)],
);
