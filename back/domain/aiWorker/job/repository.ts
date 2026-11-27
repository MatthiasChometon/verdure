import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, isNull, lt, type SQL } from 'drizzle-orm';
import { insertedRow } from '../../../infrastructure/database/inserted-row';
import {
  DATABASE,
  type Database,
} from '../../../infrastructure/database/token';
import {
  ACTIVE_STATUSES,
  FailReason,
  JobKind,
  RecognitionStatus,
} from './enum';
import { RecognitionJob } from './model';
import { recognitionJob } from './schema';
import type { ClaimedJob } from './type';

@Injectable()
export class RecognitionJobRepository {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  async enqueue(userId: string, imageKey: string): Promise<string> {
    const created = insertedRow(
      await this.database
        .insert(recognitionJob)
        .values({ userId, kind: JobKind.IDENTIFY, imageKey })
        .returning({ id: recognitionJob.id }),
    );
    return created.id;
  }

  // Deduplicated: reuses an in-flight job for the same text instead of piling up.
  async enqueueQueryEmbedding(userId: string, text: string): Promise<string> {
    const [existing] = await this.database
      .select({ id: recognitionJob.id })
      .from(recognitionJob)
      .where(
        and(
          eq(recognitionJob.userId, userId),
          eq(recognitionJob.kind, JobKind.EMBED),
          isNull(recognitionJob.plantId),
          eq(recognitionJob.inputText, text),
          inArray(recognitionJob.status, ACTIVE_STATUSES),
        ),
      )
      .limit(1);
    if (existing !== undefined) {
      return existing.id;
    }
    const created = insertedRow(
      await this.database
        .insert(recognitionJob)
        .values({ userId, kind: JobKind.EMBED, inputText: text })
        .returning({ id: recognitionJob.id }),
    );
    return created.id;
  }

  // Deduplicated per plant; returns false when already in flight, so the backfill loop doesn't spin.
  async enqueuePlantEmbedding(
    userId: string,
    plantId: string,
    text: string,
  ): Promise<boolean> {
    const [existing] = await this.database
      .select({ id: recognitionJob.id })
      .from(recognitionJob)
      .where(
        and(
          eq(recognitionJob.userId, userId),
          eq(recognitionJob.kind, JobKind.EMBED),
          eq(recognitionJob.plantId, plantId),
          inArray(recognitionJob.status, ACTIVE_STATUSES),
        ),
      )
      .limit(1);
    if (existing !== undefined) {
      return false;
    }
    await this.database
      .insert(recognitionJob)
      .values({ userId, kind: JobKind.EMBED, plantId, inputText: text });
    return true;
  }

  async findForUser(
    userId: string,
    id: string,
  ): Promise<RecognitionJob | undefined> {
    const [row] = await this.database
      .select({
        id: recognitionJob.id,
        status: recognitionJob.status,
        species: recognitionJob.species,
        failReason: recognitionJob.failReason,
      })
      .from(recognitionJob)
      .where(and(eq(recognitionJob.id, id), eq(recognitionJob.userId, userId)))
      .limit(1);
    if (row === undefined) {
      return undefined;
    }
    return row;
  }

  // Atomically claim the oldest pending job for this user, flipping it to
  // processing. SKIP LOCKED means two workers never grab the same job.
  async claimNext(userId: string): Promise<ClaimedJob | undefined> {
    return this.database.transaction(async (tx) => {
      const [pending] = await tx
        .select({
          id: recognitionJob.id,
          kind: recognitionJob.kind,
          imageKey: recognitionJob.imageKey,
          inputText: recognitionJob.inputText,
          plantId: recognitionJob.plantId,
        })
        .from(recognitionJob)
        .where(
          and(
            eq(recognitionJob.userId, userId),
            eq(recognitionJob.status, RecognitionStatus.PENDING),
          ),
        )
        .orderBy(asc(recognitionJob.createdAt), asc(recognitionJob.id))
        .limit(1)
        .for('update', { skipLocked: true });
      if (pending === undefined) {
        return undefined;
      }
      await tx
        .update(recognitionJob)
        .set({ status: RecognitionStatus.PROCESSING, updatedAt: new Date() })
        .where(eq(recognitionJob.id, pending.id));
      return {
        id: pending.id,
        kind: pending.kind,
        imageKey: pending.imageKey ?? undefined,
        inputText: pending.inputText ?? undefined,
        plantId: pending.plantId ?? undefined,
      };
    });
  }

  // Fails the user's jobs still `processing` since before `staleBefore`: their worker is
  // gone. Resolves to the uploaded photos to drop; a diagnose job's photo belongs to the plant.
  async failStale(userId: string, staleBefore: Date): Promise<string[]> {
    const failed = await this.database
      .update(recognitionJob)
      .set({ status: RecognitionStatus.FAILED, updatedAt: new Date() })
      .where(
        and(
          eq(recognitionJob.userId, userId),
          eq(recognitionJob.status, RecognitionStatus.PROCESSING),
          lt(recognitionJob.updatedAt, staleBefore),
        ),
      )
      .returning({
        kind: recognitionJob.kind,
        imageKey: recognitionJob.imageKey,
      });
    return failed.flatMap((row) =>
      row.kind === JobKind.IDENTIFY && row.imageKey !== null
        ? [row.imageKey]
        : [],
    );
  }

  // The job, only while it can still take a result: a retried or late report
  // never overwrites a finished job (nor removes its photo twice).
  private openJob(userId: string, id: string): SQL | undefined {
    return and(
      eq(recognitionJob.id, id),
      eq(recognitionJob.userId, userId),
      inArray(recognitionJob.status, ACTIVE_STATUSES),
    );
  }

  // No species = not recognised; scoped by user so a worker only finishes its own jobs.
  // Resolves to the stored image key to drop (undefined when there is none).
  async complete(
    userId: string,
    id: string,
    species?: string,
  ): Promise<string | undefined> {
    const [row] = await this.database
      .update(recognitionJob)
      .set({
        status: RecognitionStatus.DONE,
        species: species ?? null,
        updatedAt: new Date(),
      })
      .where(this.openJob(userId, id))
      .returning({ imageKey: recognitionJob.imageKey });
    return row?.imageKey ?? undefined;
  }

  // Finish an embed job with its vector, returning what the result is for so the
  // caller can route it (a plant embedding, or a cached query embedding).
  async completeEmbedding(
    userId: string,
    id: string,
    embedding: number[],
  ): Promise<{ plantId?: string; inputText?: string } | undefined> {
    const [row] = await this.database
      .update(recognitionJob)
      .set({ status: RecognitionStatus.DONE, embedding, updatedAt: new Date() })
      .where(this.openJob(userId, id))
      .returning({
        plantId: recognitionJob.plantId,
        inputText: recognitionJob.inputText,
      });
    if (row === undefined) {
      return undefined;
    }
    return {
      plantId: row.plantId ?? undefined,
      inputText: row.inputText ?? undefined,
    };
  }

  // Resolves to the stored image key to drop (undefined when there is none).
  async fail(
    userId: string,
    id: string,
    reason?: FailReason,
  ): Promise<string | undefined> {
    const [row] = await this.database
      .update(recognitionJob)
      .set({
        status: RecognitionStatus.FAILED,
        failReason: reason ?? null,
        updatedAt: new Date(),
      })
      .where(this.openJob(userId, id))
      .returning({ imageKey: recognitionJob.imageKey });
    return row?.imageKey ?? undefined;
  }
}
