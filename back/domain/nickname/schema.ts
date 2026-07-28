import {
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

// Pre-generated funny plant nicknames, drawn instantly at request time (no LLM
// in the hot path). `genus` is the lowercased plant genus, or '' for the
// generic bank used when no species is picked yet. Refilled from scratch by
// `pnpm db:seed-nicknames`.
export const nickname = pgTable(
  'nickname',
  {
    id: uuid('id').primaryKey().defaultRandom(),
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

// Curated source vocabulary the bank is generated from: first names, decorator
// words (per language) and plant genera. Seeded in the migration; the bank is
// (re)built from these rows by `pnpm db:seed-nicknames`.
export const nicknameSource = pgTable(
  'nickname_source',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kind: text('kind').notNull(),
    lang: text('lang').notNull().default(''),
    value: text('value').notNull(),
  },
  (table) => [
    unique('nickname_source_unique').on(table.kind, table.lang, table.value),
  ],
);
