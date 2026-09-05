import { randomUUID } from 'node:crypto';
import {
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

// Pre-generated, drawn instantly (no LLM in the hot path). genus '' = generic
// bank. Refilled from scratch by `pnpm db:seed-nicknames`.
export const nickname = pgTable(
  'nickname',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    genus: text('genus').notNull().default(''),
    lang: text('lang').notNull(),
    name: text('name').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('nickname_lookup_idx').on(table.genus, table.lang),
    unique('nickname_unique').on(table.genus, table.lang, table.name),
  ],
);

// Curated vocabulary the bank is (re)built from by `pnpm db:seed-nicknames`.
export const nicknameSource = pgTable(
  'nickname_source',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    kind: text('kind').notNull(),
    lang: text('lang').notNull().default(''),
    value: text('value').notNull(),
  },
  (table) => [
    unique('nickname_source_unique').on(table.kind, table.lang, table.value),
  ],
);
