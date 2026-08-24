import { randomUUID } from 'node:crypto';
import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

// A per-user credential for a local AI worker (bring-your-own-GPU). Only the
// SHA-256 hash of the token is stored; the plaintext is shown to the user once,
// to paste into the worker installer. `lastSeenAt` is bumped on every
// authenticated worker call and drives the "is a worker online?" check.
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
