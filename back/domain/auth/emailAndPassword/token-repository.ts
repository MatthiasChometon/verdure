import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import {
  DATABASE,
  type Database,
} from '../../../infrastructure/database/token';
import { authToken } from './schema';
import { AuthTokenType } from './type';

@Injectable()
export class AuthTokenRepository {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  // Issues a fresh token, replacing any previous one of the same type so a
  // user only ever has one active link. Returns the raw token (emailed once).
  async issue(
    userId: string,
    type: AuthTokenType,
    ttlSeconds: number,
  ): Promise<string> {
    await this.database
      .delete(authToken)
      .where(and(eq(authToken.userId, userId), eq(authToken.type, type)));

    const raw = randomBytes(32).toString('hex');
    await this.database.insert(authToken).values({
      userId,
      type,
      tokenHash: this.hash(raw),
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
    });
    return raw;
  }

  // Consumes a token: deletes it (single-use) and returns the owner id, or
  // undefined when the token is unknown or expired.
  async consume(raw: string, type: AuthTokenType): Promise<string | undefined> {
    const [found] = await this.database
      .select()
      .from(authToken)
      .where(
        and(eq(authToken.tokenHash, this.hash(raw)), eq(authToken.type, type)),
      );
    if (found === undefined) {
      return;
    }

    await this.database.delete(authToken).where(eq(authToken.id, found.id));

    if (found.expiresAt.getTime() < Date.now()) {
      return;
    }
    return found.userId;
  }

  private hash(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}
