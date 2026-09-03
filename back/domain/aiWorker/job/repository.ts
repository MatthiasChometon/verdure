import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import {
  DATABASE,
  type Database,
} from '../../../infrastructure/database/token';
import { JobKind, RecognitionStatus } from './enum';
import { RecognitionJob } from './model';
import { recognitionJob } from './schema';
import type { ClaimedJob } from './type';

const ACTIVE = [RecognitionStatus.PENDING, RecognitionStatus.PROCESSING];

@Injectable()
export class RecognitionJobRepository {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  async enqueue(userId: string, imageKey: string): Promise<string> {
    const [created] = await this.database
      .insert(recognitionJob)
      .values({ userId, kind: JobKind.IDENTIFY, imageKey })
      .returning({ id: recognitionJob.id });
    return created.id;
  }

  // Queue a search-query embedding. Deduplicated: while one is still in flight
  // for the same text, reuse it rather than piling up jobs as the user types /
  // the front retries.
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
          inArray(recognitionJob.status, ACTIVE),
        ),
      )
      .limit(1);
    if (existing !== undefined) {
      return existing.id;
    }
    const [created] = await this.database
      .insert(recognitionJob)
      .values({ userId, kind: JobKind.EMBED, inputText: text })
      .returning({ id: recognitionJob.id });
    return created.id;
  }

  // Queue a plant's embedding. Deduplicated per plant so a backfill sweep and a
  // save don't enqueue the same plant twice. Returns whether a new job was
  // actually inserted (false when one is already in flight for that plant), so
  // the backfill loop can tell real new work from a no-op and not spin.
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
          inArray(recognitionJob.status, ACTIVE),
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
    return {
      id: row.id,
      status: row.status as RecognitionStatus,
      species: row.species,
      failReason: row.failReason,
    };
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
        .orderBy(asc(recognitionJob.createdAt))
        .limit(1)
        .for('update', { skipLocked: true });
      if (pending === undefined) {
        return undefined;
      }
      await tx
        .update(recognitionJob)
        .set({ status: RecognitionStatus.PROCESSING, updatedAt: new Date() })
        .where(eq(recognitionJob.id, pending.id));
      return pending;
    });
  }

  // Finish an identify job with its reconciled species (null = not recognised),
  // returning the image key to clean up. Scoped by user so a worker can only
  // finish its own jobs.
  async complete(
    userId: string,
    id: string,
    species: string | null,
  ): Promise<string | null | undefined> {
    const [row] = await this.database
      .update(recognitionJob)
      .set({ status: RecognitionStatus.DONE, species, updatedAt: new Date() })
      .where(and(eq(recognitionJob.id, id), eq(recognitionJob.userId, userId)))
      .returning({ imageKey: recognitionJob.imageKey });
    return row?.imageKey;
  }

  // Finish an embed job with its vector, returning what the result is for so the
  // caller can route it (a plant embedding, or a cached query embedding).
  async completeEmbedding(
    userId: string,
    id: string,
    embedding: number[],
  ): Promise<{ plantId: string | null; inputText: string | null } | undefined> {
    const [row] = await this.database
      .update(recognitionJob)
      .set({ status: RecognitionStatus.DONE, embedding, updatedAt: new Date() })
      .where(and(eq(recognitionJob.id, id), eq(recognitionJob.userId, userId)))
      .returning({
        plantId: recognitionJob.plantId,
        inputText: recognitionJob.inputText,
      });
    return row;
  }

  async fail(
    userId: string,
    id: string,
    reason: string | null = null,
  ): Promise<string | null | undefined> {
    const [row] = await this.database
      .update(recognitionJob)
      .set({
        status: RecognitionStatus.FAILED,
        failReason: reason,
        updatedAt: new Date(),
      })
      .where(and(eq(recognitionJob.id, id), eq(recognitionJob.userId, userId)))
      .returning({ imageKey: recognitionJob.imageKey });
    return row?.imageKey;
  }
}
