import { randomUUID } from 'node:crypto';
import {
  index,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

// Three kinds share one queue (single long-poll endpoint): identify (image->species),
// embed (text->vector, routed here since shared hosting can't reach an embedder/worker via NAT), diagnose (plant image->assessment, image kept since it belongs to the plant).
export const recognitionJob = pgTable(
  'recognition_job',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: uuid('user_id').notNull(),
    kind: text('kind').notNull().default('identify'),
    // identify jobs only.
    imageKey: text('image_key'),
    status: text('status').notNull().default('pending'),
    species: text('species'),
    // 'quota' (Pl@ntNet key exhausted) or 'limit' (shared-key daily cap); null for plain "not recognised".
    failReason: text('fail_reason'),
    // embed jobs only: text to embed + resulting vector; plant_id null for a search-query embedding.
    inputText: text('input_text'),
    embedding: real('embedding').array(),
    // plant_id: for an embed job, the plant being embedded; for a diagnose job,
    // the plant being assessed (and whose image_key is reused). Null otherwise.
    plantId: uuid('plant_id'),
    // diagnose jobs only: the worker's free-text health assessment (probable
    // causes + care advice) once done.
    diagnosis: text('diagnosis'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    // Claim ordering: oldest pending job first, per user.
    index('recognition_job_claim_idx').on(table.status, table.createdAt),
  ],
);
