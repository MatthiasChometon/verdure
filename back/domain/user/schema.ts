import { randomUUID } from 'node:crypto';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  googleId: text('google_id').unique(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  passwordHash: text('password_hash'),
  emailVerifiedAt: timestamp('email_verified_at'),
  locale: text('locale').notNull().default('fr'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
