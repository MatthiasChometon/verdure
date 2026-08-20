import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gt } from 'drizzle-orm';
import {
  DATABASE,
  type Database,
} from '../../../infrastructure/database/token';
import { IssuedWorkerToken, WorkerToken } from './model';
import { workerToken } from './schema';
import { WorkerTokenService } from './token.service';

// A worker counts as online if it phoned home within this window. The claim
// long-poll reconnects well inside it, so an idle-but-connected worker stays
// online.
const ONLINE_WINDOW_SECONDS = 60;

@Injectable()
export class WorkerTokenRepository {
  constructor(
    @Inject(DATABASE) private readonly database: Database,
    private readonly tokens: WorkerTokenService,
  ) {}

  async issue(
    userId: string,
    label: string | undefined,
  ): Promise<IssuedWorkerToken> {
    const { plain, hash } = this.tokens.generate();
    const [created] = await this.database
      .insert(workerToken)
      .values({ userId, tokenHash: hash, label: label ?? null })
      .returning({ id: workerToken.id, label: workerToken.label });
    return { id: created.id, label: created.label, token: plain };
  }

  // Resolve a presented plaintext token to its owner, bumping lastSeenAt so the
  // worker counts as online. Undefined for an unknown token.
  async authenticate(
    plain: string,
  ): Promise<{ tokenId: string; userId: string } | undefined> {
    const [row] = await this.database
      .update(workerToken)
      .set({ lastSeenAt: new Date() })
      .where(eq(workerToken.tokenHash, this.tokens.hash(plain)))
      .returning({ id: workerToken.id, userId: workerToken.userId });
    if (row === undefined) {
      return undefined;
    }
    return { tokenId: row.id, userId: row.userId };
  }

  async isOnline(userId: string): Promise<boolean> {
    const since = new Date(Date.now() - ONLINE_WINDOW_SECONDS * 1000);
    const [row] = await this.database
      .select({ id: workerToken.id })
      .from(workerToken)
      .where(
        and(eq(workerToken.userId, userId), gt(workerToken.lastSeenAt, since)),
      )
      .limit(1);
    return row !== undefined;
  }

  async listByUser(userId: string): Promise<WorkerToken[]> {
    const rows = await this.database
      .select({
        id: workerToken.id,
        label: workerToken.label,
        lastSeenAt: workerToken.lastSeenAt,
      })
      .from(workerToken)
      .where(eq(workerToken.userId, userId))
      .orderBy(desc(workerToken.createdAt));
    const threshold = Date.now() - ONLINE_WINDOW_SECONDS * 1000;
    return rows.map((row) => ({
      id: row.id,
      label: row.label,
      online: row.lastSeenAt !== null && row.lastSeenAt.getTime() > threshold,
      lastSeenAt: row.lastSeenAt?.toISOString() ?? null,
    }));
  }

  async revoke(userId: string, id: string): Promise<boolean> {
    const [deleted] = await this.database
      .delete(workerToken)
      .where(and(eq(workerToken.id, id), eq(workerToken.userId, userId)))
      .returning({ id: workerToken.id });
    return deleted !== undefined;
  }
}
