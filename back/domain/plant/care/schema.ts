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

// One care type per plant (unique index), cascade-deleted with the plant. Watering keeps
// its own season-aware model and is deliberately not stored here.
export const careSchedule = pgTable(
  'care_schedule',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    plantId: uuid('plant_id')
      .notNull()
      .references(() => plant.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    // One of the CareType enum values; validated at the GraphQL boundary.
    careType: text('care_type').notNull(),
    intervalDays: integer('interval_days').notNull(),
    lastDoneOn: date('last_done_on'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('care_schedule_plant_type_unique').on(
      table.plantId,
      table.careType,
    ),
  ],
);
