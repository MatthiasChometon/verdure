import { randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../../infrastructure/database/token';
import { calendarFeedToken } from './schema';

const newToken = (): string => randomBytes(32).toString('hex');

@Injectable()
export class CalendarFeedTokenRepository {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  // Returns the user's feed token, minting one on first use. The insert is the
  // arbiter: two first calls race on the unique user_id and both read the winner.
  async tokenFor(userId: string): Promise<string> {
    await this.database
      .insert(calendarFeedToken)
      .values({ userId, token: newToken() })
      .onConflictDoNothing({ target: calendarFeedToken.userId });
    const [row] = await this.database
      .select({ token: calendarFeedToken.token })
      .from(calendarFeedToken)
      .where(eq(calendarFeedToken.userId, userId));
    if (row === undefined) {
      throw new Error('Calendar feed token vanished right after its upsert.');
    }
    return row.token;
  }

  // Replaces the token, invalidating any calendar already subscribed to the
  // previous link. One upsert statement: there is no instant without a token,
  // and two concurrent calls cannot collide on user_id.
  async regenerate(userId: string): Promise<string> {
    const token = newToken();
    await this.database
      .insert(calendarFeedToken)
      .values({ userId, token })
      .onConflictDoUpdate({
        target: calendarFeedToken.userId,
        set: { token },
      });
    return token;
  }

  async userIdFor(token: string): Promise<string | undefined> {
    const [found] = await this.database
      .select({ userId: calendarFeedToken.userId })
      .from(calendarFeedToken)
      .where(eq(calendarFeedToken.token, token))
      .limit(1);
    return found?.userId;
  }
}
