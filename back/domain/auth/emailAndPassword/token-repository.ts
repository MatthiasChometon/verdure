import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, sql } from 'drizzle-orm';
import {
  DATABASE,
  type Database,
  type DatabaseExecutor,
} from '../../../infrastructure/database/token';
import { authToken } from './schema';
import { AuthTokenType } from './type';

@Injectable()
export class AuthTokenRepository {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  // Issues a fresh token, replacing any previous one of the same type so a
  // user normally has one active link (nothing in the schema forbids a second
  // one: two concurrent issues can both insert, and both links then work until
  // they expire). Returns the raw token (emailed once).
  // Replace and insert are one transaction: a failed insert never leaves the
  // user without a link while the old one is already gone.
  async issue(
    userId: string,
    type: AuthTokenType,
    ttlSeconds: number,
  ): Promise<string> {
    const raw = randomBytes(32).toString('hex');
    await this.database.transaction(async (tx) => {
      await tx
        .delete(authToken)
        .where(and(eq(authToken.userId, userId), eq(authToken.type, type)));
      await tx.insert(authToken).values({
        userId,
        type,
        tokenHash: this.hash(raw),
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      });
    });
    return raw;
  }

  // Spends a token: one DELETE ... RETURNING, so two concurrent redemptions can
  // never both win. Expiry is checked in that same statement, against the
  // database clock; an expired token is therefore left in place (the next issue
  // for that user and type replaces it) rather than purged. Returns the owner
  // id, or undefined when the token is unknown, already spent or expired. Pass the transaction of the write the
  // token authorises: if that write fails, the token is not burnt.
  async spend(
    raw: string,
    type: AuthTokenType,
    executor: DatabaseExecutor = this.database,
  ): Promise<string | undefined> {
    const [spent] = await executor
      .delete(authToken)
      .where(
        and(
          eq(authToken.tokenHash, this.hash(raw)),
          eq(authToken.type, type),
          gt(authToken.expiresAt, sql`now()`),
        ),
      )
      .returning({ userId: authToken.userId });
    return spent?.userId;
  }

  private hash(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}
