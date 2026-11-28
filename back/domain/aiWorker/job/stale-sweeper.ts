import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { positiveIntegerSetting } from '../../../infrastructure/config/env';
import { FileStorageService } from '../../../infrastructure/file-storage/service';
import { RecognitionJobRepository } from './repository';

// The worker gives a job 400 s at most (ai/worker/app.py) and retries its report for a
// little longer: a job still `processing` after this long lost its worker (killed, or
// the back was unreachable after the retries). With several workers for one user this
// threshold is what protects a job another worker is still running.
const DEFAULT_STALE_MS = 15 * 60_000;
const SWEEP_EVERY_MS = 5 * 60_000;

// Fails the jobs whose result never arrived, so the app stops showing "analysing…" for
// good. It runs at start-up, then every few minutes while the process lives (no external
// cron, nothing wakes a sleeping process), and for one user when their app polls a job
// or their worker asks for work: that user sees the result at once instead of at the
// next tick. A job the worker is still processing is never touched.
@Injectable()
export class StaleJobSweeper
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(StaleJobSweeper.name);
  private readonly staleMs: number;
  private timer: NodeJS.Timeout | undefined;

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

  onApplicationBootstrap(): void {
    this.sweepInBackground();
    this.timer = setInterval(() => {
      this.sweepInBackground();
    }, SWEEP_EVERY_MS);
    // The timer never keeps the process alive: it only runs while the process lives.
    this.timer.unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
    this.timer = undefined;
  }

  async sweep(userId?: string): Promise<void> {
    const spentKeys = await this.jobs.failStale(this.staleBefore(), userId);
    // The rows are already failed and never come back here: a photo that cannot be
    // removed is logged, and never stops the others nor the caller's request.
    const outcomes = await Promise.allSettled(
      spentKeys.map((key) => this.storage.remove(key)),
    );
    outcomes.forEach((outcome, index) => {
      if (outcome.status === 'rejected') {
        this.logger.error(
          `Could not remove the photo ${spentKeys[index] ?? '?'} of a stale job`,
          outcome.reason instanceof Error
            ? outcome.reason.stack
            : outcome.reason,
        );
      }
    });
  }

  private staleBefore(): Date {
    return new Date(Date.now() - this.staleMs);
  }

  private sweepInBackground(): void {
    this.sweep().catch((error: unknown) => {
      this.logger.error(
        'The sweep of stale jobs failed',
        error instanceof Error ? error.stack : error,
      );
    });
  }
}
