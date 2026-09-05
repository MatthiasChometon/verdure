import { randomUUID } from 'node:crypto';
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { plant } from '../schema';
import type { JournalEntryKind } from './enum';

// One row per dated entry (note, milestone, or photo); ordered by createdAt as a timeline.
export const journalEntry = pgTable(
  'journal_entry',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn((): string => randomUUID()),
    plantId: uuid('plant_id')
      .notNull()
      .references(() => plant.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    kind: text('kind').$type<JournalEntryKind>().notNull(),
    note: text('note'),
    imageKey: text('image_key'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    // The timeline is always read for one plant, newest first.
    index('journal_entry_plant_idx').on(table.plantId, table.createdAt),
  ],
);
