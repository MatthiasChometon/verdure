import { randomUUID } from 'node:crypto';
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Single-use, expiring tokens for email verification and password reset.
// Only the SHA-256 hash of the token is stored, never the raw value.
export const authToken = pgTable(
  'auth_token',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: uuid('user_id').notNull(),
    type: text('type').notNull(),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    // A link is redeemed by its hash; issuing one clears the user's previous ones.
    index('auth_token_token_hash_idx').on(table.tokenHash),
    index('auth_token_user_type_idx').on(table.userId, table.type),
  ],
);
