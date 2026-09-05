import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import {
  DATABASE,
  type Database,
} from '../../../infrastructure/database/token';
import { plant } from '../../plant/schema';
import { JobKind, RecognitionStatus } from '../job/enum';
import { recognitionJob } from '../job/schema';
import { DiagnosisJob } from './model';

// Reuses the plant's own stored image (same one-way plant<-aiWorker coupling as embedding),
// so a diagnosis never re-uploads and never touches the object store.
@Injectable()
export class DiagnosisJobRepository {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  // undefined when the plant has no stored photo — nothing to send the vision model.
  async enqueue(userId: string, plantId: string): Promise<string | undefined> {
    const [found] = await this.database
      .select({ imageKey: plant.imageKey })
      .from(plant)
      .where(and(eq(plant.id, plantId), eq(plant.userId, userId)))
      .limit(1);
    if (found === undefined || found.imageKey === null) {
      return undefined;
    }
    const [created] = await this.database
      .insert(recognitionJob)
      .values({
        userId,
        kind: JobKind.DIAGNOSE,
        imageKey: found.imageKey,
        plantId,
      })
      .returning({ id: recognitionJob.id });
    return created.id;
  }

  async findForUser(
    userId: string,
    id: string,
  ): Promise<DiagnosisJob | undefined> {
    const [row] = await this.database
      .select({
        id: recognitionJob.id,
        status: recognitionJob.status,
        diagnosis: recognitionJob.diagnosis,
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
      diagnosis: row.diagnosis,
      failReason: row.failReason,
    };
  }

  // Finish a diagnose job with the worker's assessment. Scoped by user so a
  // worker can only finish its own jobs. The plant's image is left in place.
  async complete(userId: string, id: string, diagnosis: string): Promise<void> {
    await this.database
      .update(recognitionJob)
      .set({
        status: RecognitionStatus.DONE,
        diagnosis,
        updatedAt: new Date(),
      })
      .where(and(eq(recognitionJob.id, id), eq(recognitionJob.userId, userId)));
  }

  async fail(userId: string, id: string): Promise<void> {
    await this.database
      .update(recognitionJob)
      .set({ status: RecognitionStatus.FAILED, updatedAt: new Date() })
      .where(and(eq(recognitionJob.id, id), eq(recognitionJob.userId, userId)));
  }
}
