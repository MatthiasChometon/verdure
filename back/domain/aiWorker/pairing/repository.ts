import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gt } from 'drizzle-orm';
import {
  DATABASE,
  type Database,
} from '../../../infrastructure/database/token';
import { PairingRequest } from './model';
import { WorkerPairingService } from './service';
import { workerPairing } from './schema';

const TTL_SECONDS = 10 * 60;

export type PairingPoll =
  | { status: 'pending' }
  | { status: 'approved'; token: string | null }
  | { status: 'denied' }
  | { status: 'expired' };

@Injectable()
export class WorkerPairingRepository {
  constructor(
    @Inject(DATABASE) private readonly database: Database,
    private readonly pairing: WorkerPairingService,
  ) {}

  // Open a pairing and hand the worker its code + polling secret.
  async start(
    label: string | undefined,
  ): Promise<{ code: string; secret: string; expiresAt: Date }> {
    const code = this.pairing.generateCode();
    const { plain, hash } = this.pairing.generateSecret();
    const expiresAt = new Date(Date.now() + TTL_SECONDS * 1000);
    await this.database.insert(workerPairing).values({
      code,
      secretHash: hash,
      label: label ?? null,
      expiresAt,
    });
    return { code, secret: plain, expiresAt };
  }

  // The worker polls with its secret; expired/unknown both read as 'expired' so
  // the worker restarts a fresh pairing.
  async poll(secret: string): Promise<PairingPoll> {
    const [row] = await this.database
      .select()
      .from(workerPairing)
      .where(eq(workerPairing.secretHash, this.pairing.hash(secret)))
      .limit(1);

    if (row === undefined || row.expiresAt.getTime() < Date.now()) {
      return { status: 'expired' };
    }
    if (row.status === 'denied') {
      return { status: 'denied' };
    }
    if (row.status === 'approved') {
      // Hand the token over once, then clear it so it is not readable again.
      if (row.issuedToken !== null) {
        await this.database
          .update(workerPairing)
          .set({ issuedToken: null })
          .where(eq(workerPairing.id, row.id));
      }
      return { status: 'approved', token: row.issuedToken };
    }
    return { status: 'pending' };
  }

  // The active pairing behind a code, for the approval screen. Undefined when no
  // pending, unexpired pairing carries that code.
  async pendingByCode(code: string): Promise<PairingRequest | undefined> {
    const [row] = await this.database
      .select({ code: workerPairing.code, label: workerPairing.label })
      .from(workerPairing)
      .where(
        and(
          eq(workerPairing.code, code),
          eq(workerPairing.status, 'pending'),
          gt(workerPairing.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(workerPairing.createdAt))
      .limit(1);
    if (row === undefined) {
      return undefined;
    }
    return { code: row.code, label: row.label };
  }

  // Bind the freshly minted token to the pairing so the worker can collect it.
  async approve(
    code: string,
    userId: string,
    token: string,
  ): Promise<boolean> {
    const active = await this.pendingByCode(code);
    if (active === undefined) {
      return false;
    }
    const [updated] = await this.database
      .update(workerPairing)
      .set({ status: 'approved', userId, issuedToken: token })
      .where(
        and(
          eq(workerPairing.code, code),
          eq(workerPairing.status, 'pending'),
          gt(workerPairing.expiresAt, new Date()),
        ),
      )
      .returning({ id: workerPairing.id });
    return updated !== undefined;
  }

  async deny(code: string): Promise<boolean> {
    const [updated] = await this.database
      .update(workerPairing)
      .set({ status: 'denied' })
      .where(
        and(
          eq(workerPairing.code, code),
          eq(workerPairing.status, 'pending'),
        ),
      )
      .returning({ id: workerPairing.id });
    return updated !== undefined;
  }
}
