import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// A plant-recognition request queued for the user's own local AI worker to
// process. The phone enqueues it (with the uploaded photo), the worker claims
// it, runs the model on its GPU and posts the species back. Status flows
// pending -> processing -> done | failed. The image is removed once terminal.
export const recognitionJob = pgTable(
  'recognition_job',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    imageKey: text('image_key').notNull(),
    status: text('status').notNull().default('pending'),
    species: text('species'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    // Claim ordering: oldest pending job first, per user.
    index('recognition_job_claim_idx').on(table.status, table.createdAt),
  ],
);
