import { randomUUID } from 'node:crypto';
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// A short-lived device-pairing handshake, so a freshly installed worker gets its
// token without the user ever copying one. The worker starts a pairing, shows
// the `code` and opens the app; the signed-in user approves that code, which
// binds a worker token to their account and stashes its plaintext here for the
// worker's next poll to collect (then it is cleared). The worker polls by a long
// random secret — only its SHA-256 hash is stored, never the secret itself.
export const workerPairing = pgTable(
  'worker_pairing',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    code: text('code').notNull(),
    secretHash: text('secret_hash').notNull(),
    // 'pending' | 'approved' | 'denied'
    status: text('status').notNull().default('pending'),
    // The approver, and the plaintext worker token to hand back, set on approval
    // and nulled once the worker has collected it.
    userId: uuid('user_id'),
    issuedToken: text('issued_token'),
    label: text('label'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    expiresAt: timestamp('expires_at').notNull(),
  },
  (table) => [
    index('worker_pairing_code_idx').on(table.code),
    index('worker_pairing_secret_hash_idx').on(table.secretHash),
  ],
);
