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
// GPU. Two kinds share one queue (so the worker long-polls a single endpoint):
//   identify — a plant photo (image_key) -> species; the phone enqueues it.
//   embed    — a text (input_text) -> 768-d vector; used for semantic search
//              (the search query) and to embed a plant (plant_id set). Since the
//              back on shared hosting can reach no embedder and cannot reach the
//              worker directly (NAT), embeddings are routed through this queue.
// Status flows pending -> processing -> done | failed. The image is removed once
// an identify job is terminal.
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
    // embed jobs only: the text to embed, the resulting vector, and (for a
    // plant-embedding job) which plant it belongs to. plant_id is null for a
    // search-query embedding.
    inputText: text('input_text'),
    embedding: real('embedding').array(),
    plantId: uuid('plant_id'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    // Claim ordering: oldest pending job first, per user.
    index('recognition_job_claim_idx').on(table.status, table.createdAt),
  ],
);
