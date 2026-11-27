import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../../infrastructure/database/token';
import { wateringEvent } from '../watering/schema';

// Joined subquery avoiding a correlated subquery per row; shared by list and save.
// Scoped to one account: grouping every account's waterings made each read cost
// the size of the whole table instead of the size of the caller's own journal.
@Injectable()
export class LatestWatering {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- inferred Drizzle subquery type
  query(userId: string) {
    return this.database
      .select({
        plantId: wateringEvent.plantId,
        lastWateredOn: sql<string | null>`max(${wateringEvent.wateredOn})`.as(
          'last_watered_on',
        ),
      })
      .from(wateringEvent)
      .where(eq(wateringEvent.userId, userId))
      .groupBy(wateringEvent.plantId)
      .as('latest_watering');
  }
}
