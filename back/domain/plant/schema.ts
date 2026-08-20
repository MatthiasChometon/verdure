import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import {
  customType,
  index,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  },
});

export const plant = pgTable(
  'plant',
  {
    id: uuid('id')
      .primaryKey()
      .defaultRandom()
      .$defaultFn(() => randomUUID()),
    userId: uuid('user_id').notNull(),
    name: text('name').notNull(),
    species: text('species').notNull(),
    description: text('description'),
    imageKey: text('image_key'),
    // Seasonal watering intervals (days). Null on both = watering not tracked.
    wateringIntervalSummerDays: integer('watering_interval_summer_days'),
    wateringIntervalWinterDays: integer('watering_interval_winter_days'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    // Unit-normalised embedding of the plant text, for semantic search. Stored
    // as a plain array (cosine = dot product) so no pgvector extension is
    // required.
    embedding: real('embedding').array(),
    // Full-text index built from name + species + description (language-agnostic
    // `simple` config so Latin binomials are not mangled by stemming).
    searchVector: tsvector('search_vector').generatedAlwaysAs(
      sql`to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(species, '') || ' ' || coalesce(description, ''))`,
    ),
  },
  (table) => [
    index('plant_search_vector_idx').using('gin', table.searchVector),
    // Trigram indexes power typo-tolerant / partial matching via pg_trgm.
    index('plant_name_trgm_idx').using('gin', table.name.op('gin_trgm_ops')),
    index('plant_species_trgm_idx').using(
      'gin',
      table.species.op('gin_trgm_ops'),
    ),
  ],
);
