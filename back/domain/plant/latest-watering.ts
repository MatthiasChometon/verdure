import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../../infrastructure/database/token';
import { wateringEvent } from './watering/schema';

// Joined subquery avoiding a correlated subquery per row; shared by list and save.
@Injectable()
export class LatestWatering {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- inferred Drizzle subquery type
  query() {
    return this.database
      .select({
        plantId: wateringEvent.plantId,
        lastWateredOn: sql<string | null>`max(${wateringEvent.wateredOn})`.as(
          'last_watered_on',
        ),
      })
      .from(wateringEvent)
      .groupBy(wateringEvent.plantId)
      .as('latest_watering');
  }
}
