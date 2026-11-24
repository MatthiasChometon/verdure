import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
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
  // user only ever has one active link. Returns the raw token (emailed once).
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
  // never both win. Returns the owner id, or undefined when the token is
  // unknown, already spent or expired. Pass the transaction of the write the
  // token authorises: if that write fails, the token is not burnt.
  async spend(
    raw: string,
    type: AuthTokenType,
    _executor: DatabaseExecutor = this.database,
  ): Promise<string | undefined> {
    const [found] = await this.database
      .select()
      .from(authToken)
      .where(
        and(eq(authToken.tokenHash, this.hash(raw)), eq(authToken.type, type)),
      );
    if (found === undefined) {
      return undefined;
    }
    await this.database.delete(authToken).where(eq(authToken.id, found.id));
    if (found.expiresAt.getTime() < Date.now()) {
      return undefined;
    }
    return found.userId;
  }

  private hash(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}
