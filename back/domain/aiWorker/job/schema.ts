import { randomUUID } from 'node:crypto';
import {
  index,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

// A unit of work queued for the user's own local AI worker to process on its
// GPU. Three kinds share one queue (so the worker long-polls a single endpoint):
//   identify — a plant photo (image_key) -> species; the phone enqueues it.
//   embed    — a text (input_text) -> 768-d vector; used for semantic search
//              (the search query) and to embed a plant (plant_id set). Since the
//              back on shared hosting can reach no embedder and cannot reach the
//              worker directly (NAT), embeddings are routed through this queue.
//   diagnose — a plant photo (image_key of an existing plant, plant_id set) ->
//              a free-text health assessment (diagnosis); the detail page
//              enqueues it. Unlike identify, the image belongs to the plant, so
//              it is never removed when the job is terminal.
// Status flows pending -> processing -> done | failed. The image is removed once
// an identify job is terminal (never for a diagnose job).
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
    // Why an identify job failed, when it matters to the user: 'quota' (the
    // Pl@ntNet key is exhausted/unavailable) or 'limit' (the shared-key daily cap
    // was reached). Null for a plain "not recognised".
    failReason: text('fail_reason'),
    // embed jobs only: the text to embed, the resulting vector, and (for a
    // plant-embedding job) which plant it belongs to. plant_id is null for a
    // search-query embedding.
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
