import { randomUUID } from 'node:crypto';
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

// Local index of accepted plant species (seeded from GBIF): powers the
// typo-tolerant autocomplete and guess normalisation without hitting GBIF live.
export const species = pgTable(
  'species',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    gbifKey: integer('gbif_key').notNull().unique(),
    name: text('name').notNull().unique(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('species_name_trgm_idx').using('gin', table.name.op('gin_trgm_ops')),
  ],
);
