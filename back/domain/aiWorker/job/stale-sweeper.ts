import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { positiveIntegerSetting } from '../../../infrastructure/config/env';
import { FileStorageService } from '../../../infrastructure/file-storage/service';
import { RecognitionJobRepository } from './repository';

// The worker gives a job 400 s at most (ai/worker/app.py) and retries its report for a
// little longer: a job still `processing` after this long lost its worker (killed, or
// the back was unreachable after the retries).
const DEFAULT_STALE_MS = 15 * 60_000;

// Fails the user's jobs whose result never arrived, so the app stops showing
// "analysing…" for good. Runs where the job is looked at (the app's polling) and when
// the worker comes back; a job the worker is still processing is never touched.
@Injectable()
export class StaleJobSweeper {
  private readonly staleMs: number;

  constructor(
    private readonly jobs: RecognitionJobRepository,
    private readonly storage: FileStorageService,
    config: ConfigService,
  ) {
    this.staleMs = positiveIntegerSetting(
      config,
      'AI_JOB_STALE_MS',
      DEFAULT_STALE_MS,
    );
  }

  async sweep(userId: string): Promise<void> {
    const spentKeys = await this.jobs.failStale(
      userId,
      new Date(Date.now() - this.staleMs),
    );
    for (const key of spentKeys) {
      await this.storage.remove(key);
    }
  }
}
