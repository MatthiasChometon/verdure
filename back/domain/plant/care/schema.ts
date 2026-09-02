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

// A plant's recurring care routine for one care type (fertilising, misting,
// rotating, repotting): how often it recurs and when it was last done. Watering
// is deliberately not stored here — it keeps its own season-aware model. One row
// per plant per care type (unique index), cascade-deleted with the plant.
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
