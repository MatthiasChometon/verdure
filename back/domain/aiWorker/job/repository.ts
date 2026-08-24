import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import {
  DATABASE,
  type Database,
} from '../../../infrastructure/database/token';
import { RecognitionStatus } from './enum';
import { RecognitionJob } from './model';
import { recognitionJob } from './schema';

@Injectable()
export class RecognitionJobRepository {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  async enqueue(userId: string, imageKey: string): Promise<string> {
    const [created] = await this.database
      .insert(recognitionJob)
      .values({ userId, imageKey })
      .returning({ id: recognitionJob.id });
    return created.id;
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
    };
  }

  // Atomically claim the oldest pending job for this user, flipping it to
  // processing. SKIP LOCKED means two workers never grab the same job.
  async claimNext(
    userId: string,
  ): Promise<{ id: string; imageKey: string } | undefined> {
    return this.database.transaction(async (tx) => {
      const [pending] = await tx
        .select({ id: recognitionJob.id, imageKey: recognitionJob.imageKey })
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

  // Finish a job with its reconciled species (null = not recognised), returning
  // the image key to clean up. Scoped by user so a worker can only finish its
  // own jobs.
  async complete(
    userId: string,
    id: string,
    species: string | null,
  ): Promise<string | undefined> {
    const [row] = await this.database
      .update(recognitionJob)
      .set({ status: RecognitionStatus.DONE, species, updatedAt: new Date() })
      .where(and(eq(recognitionJob.id, id), eq(recognitionJob.userId, userId)))
      .returning({ imageKey: recognitionJob.imageKey });
    return row?.imageKey;
  }

  async fail(userId: string, id: string): Promise<string | undefined> {
    const [row] = await this.database
      .update(recognitionJob)
      .set({ status: RecognitionStatus.FAILED, updatedAt: new Date() })
      .where(and(eq(recognitionJob.id, id), eq(recognitionJob.userId, userId)))
      .returning({ imageKey: recognitionJob.imageKey });
    return row?.imageKey;
  }
}
