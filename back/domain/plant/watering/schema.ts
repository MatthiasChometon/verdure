import { randomUUID } from 'node:crypto';
import {
  date,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { plant } from '../schema';

// Watering journal: one row per validated watering. Source of truth for the
// last-watered date and, with the plant's seasonal intervals, the next due date.
export const wateringEvent = pgTable(
  'watering_event',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    plantId: uuid('plant_id')
      .notNull()
      .references(() => plant.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    wateredOn: date('watered_on').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    // One watering per plant per day: re-watering the same day is idempotent.
    uniqueIndex('watering_event_plant_day_unique').on(
      table.plantId,
      table.wateredOn,
    ),
  ],
);

// Curated default watering intervals per botanical genus (lower-cased first word
// of the species). Seeded in the migration; used to pre-fill a plant's schedule.
export const wateringDefault = pgTable('watering_default', {
  genus: text('genus').primaryKey(),
  summerDays: integer('summer_days').notNull(),
  winterDays: integer('winter_days').notNull(),
});
