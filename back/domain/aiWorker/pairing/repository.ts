import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gt } from 'drizzle-orm';
import {
  DATABASE,
  type Database,
} from '../../../infrastructure/database/token';
import { PairingStatus } from './enum';
import { PairingRequest } from './model';
import { WorkerPairingService } from './service';
import { workerPairing } from './schema';

const TTL_MS = 10 * 60 * 1000;

export type PairingPoll =
  | { status: typeof PairingStatus.PENDING }
  | { status: typeof PairingStatus.APPROVED; token: string | null }
  | { status: typeof PairingStatus.DENIED }
  // Never stored: derived from `expiresAt` (or an unknown secret) at poll time.
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
    const expiresAt = new Date(Date.now() + TTL_MS);
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
    if (row.status === PairingStatus.DENIED) {
      return { status: PairingStatus.DENIED };
    }
    if (row.status === PairingStatus.APPROVED) {
      return {
        status: PairingStatus.APPROVED,
        token: await this.collectToken(row.id),
      };
    }
    return { status: PairingStatus.PENDING };
  }

  // Hand the token over once: the row is locked while it is read and cleared,
  // so two concurrent polls can never both receive it.
  private async collectToken(id: string): Promise<string | null> {
    return this.database.transaction(async (tx) => {
      const [locked] = await tx
        .select({ token: workerPairing.issuedToken })
        .from(workerPairing)
        .where(eq(workerPairing.id, id))
        .for('update');
      if (locked === undefined || locked.token === null) {
        return null;
      }
      await tx
        .update(workerPairing)
        .set({ issuedToken: null })
        .where(eq(workerPairing.id, id));
      return locked.token;
    });
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
          eq(workerPairing.status, PairingStatus.PENDING),
          gt(workerPairing.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(workerPairing.createdAt), desc(workerPairing.id))
      .limit(1);
    if (row === undefined) {
      return undefined;
    }
    return { code: row.code, label: row.label };
  }

  // Bind the freshly minted token to the pairing so the worker can collect it.
  async approve(code: string, userId: string, token: string): Promise<boolean> {
    const active = await this.pendingByCode(code);
    if (active === undefined) {
      return false;
    }
    const [updated] = await this.database
      .update(workerPairing)
      .set({ status: PairingStatus.APPROVED, userId, issuedToken: token })
      .where(
        and(
          eq(workerPairing.code, code),
          eq(workerPairing.status, PairingStatus.PENDING),
          gt(workerPairing.expiresAt, new Date()),
        ),
      )
      .returning({ id: workerPairing.id });
    return updated !== undefined;
  }

  async deny(code: string): Promise<boolean> {
    const [updated] = await this.database
      .update(workerPairing)
      .set({ status: PairingStatus.DENIED })
      .where(
        and(
          eq(workerPairing.code, code),
          eq(workerPairing.status, PairingStatus.PENDING),
        ),
      )
      .returning({ id: workerPairing.id });
    return updated !== undefined;
  }
}
