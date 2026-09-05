import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import {
  DATABASE,
  type Database,
} from '../../../infrastructure/database/token';
import { plantnetSharedUsage } from './schema';

@Injectable()
export class SharedQuotaRepository {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  // UTC day, so the cap resets at a single well-defined moment for everyone.
  async bumpToday(userId: string): Promise<number> {
    const day = new Date().toISOString().slice(0, 10);
    const [row] = await this.database
      .insert(plantnetSharedUsage)
      .values({ userId, day, count: 1 })
      .onConflictDoUpdate({
        target: [plantnetSharedUsage.userId, plantnetSharedUsage.day],
        set: { count: sql`${plantnetSharedUsage.count} + 1` },
      })
      .returning({ count: plantnetSharedUsage.count });
    return row?.count ?? 1;
  }
}
