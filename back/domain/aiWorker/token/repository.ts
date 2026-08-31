import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gt } from 'drizzle-orm';
import {
  DATABASE,
  type Database,
} from '../../../infrastructure/database/token';
import { IssuedWorkerToken, WorkerToken } from './model';
import { workerToken } from './schema';
import { WorkerTokenService } from './service';

// A worker counts as online if it phoned home within this window. It bumps at the
// start of each ~25s long-poll, so this stays comfortably above that — but it is
// only the FALLBACK (for an unclean drop like the PC sleeping). A clean drop is
// caught at once: the long-poll notices its connection close and marks the worker
// offline immediately (see markOffline / the worker channel).
const ONLINE_WINDOW_SECONDS = 40;

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

  // Force a worker offline right away — called when its long-poll connection
  // drops — by backdating lastSeenAt past the online window. Its next
  // authenticated call re-bumps lastSeenAt, bringing it straight back online.
  async markOffline(tokenId: string): Promise<void> {
    const stale = new Date(Date.now() - (ONLINE_WINDOW_SECONDS + 5) * 1000);
    await this.database
      .update(workerToken)
      .set({ lastSeenAt: stale })
      .where(eq(workerToken.id, tokenId));
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
