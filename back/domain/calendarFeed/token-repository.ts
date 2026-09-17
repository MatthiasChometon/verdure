import { randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../../infrastructure/database/token';
import { calendarFeedToken } from './schema';

@Injectable()
export class CalendarFeedTokenRepository {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  // Returns the user's feed token, minting one on first use.
  async tokenFor(userId: string): Promise<string> {
    const [existing] = await this.database
      .select({ token: calendarFeedToken.token })
      .from(calendarFeedToken)
      .where(eq(calendarFeedToken.userId, userId))
      .limit(1);
    return existing?.token ?? this.issue(userId);
  }

  // Replaces the token, invalidating any calendar already subscribed to the
  // previous link.
  async regenerate(userId: string): Promise<string> {
    await this.database
      .delete(calendarFeedToken)
      .where(eq(calendarFeedToken.userId, userId));
    return this.issue(userId);
  }

  async userIdFor(token: string): Promise<string | undefined> {
    const [found] = await this.database
      .select({ userId: calendarFeedToken.userId })
      .from(calendarFeedToken)
      .where(eq(calendarFeedToken.token, token))
      .limit(1);
    return found?.userId;
  }

  private async issue(userId: string): Promise<string> {
    const token = randomBytes(32).toString('hex');
    await this.database.insert(calendarFeedToken).values({ userId, token });
    return token;
  }
}
