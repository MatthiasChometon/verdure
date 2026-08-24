import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { FileStorageService } from '../../../infrastructure/file-storage/service';
import { SpeciesReconciler } from '../../species/reconciler';
import { CurrentWorker } from '../token/current-worker';
import { WorkerGuard } from '../token/guard';
import type { Worker } from '../token/type';
import { RecognitionJobRepository } from './repository';

// How long to hold a next-job request waiting for work before telling the
// worker to reconnect. Comfortably under a typical proxy idle kill; each
// reconnect also refreshes the worker's "online" status. Overridable (tests
// use a short window).
const LONG_POLL_MS = Number(process.env.AI_WORKER_LONG_POLL_MS) || 25_000;
const POLL_INTERVAL_MS = Number(process.env.AI_WORKER_POLL_INTERVAL_MS) || 1_000;

type NextJob = { jobId?: string; image?: string; contentType?: string };

@Controller('worker')
@UseGuards(WorkerGuard)
export class WorkerChannelController {
  constructor(
    private readonly jobs: RecognitionJobRepository,
    private readonly storage: FileStorageService,
    private readonly reconciler: SpeciesReconciler,
  ) {}

  // Long-poll for the next job. Returns the job + its image (base64) to run
  // locally, or an empty object after the poll window so the worker reconnects.
  @Get('next-job')
  async nextJob(@CurrentWorker() worker: Worker): Promise<NextJob> {
    const deadline = Date.now() + LONG_POLL_MS;
    for (;;) {
      const claimed = await this.jobs.claimNext(worker.userId);
      if (claimed !== undefined) {
        const image = await this.storage.read(claimed.imageKey);
        return {
          jobId: claimed.id,
          image: Buffer.from(image.body).toString('base64'),
          contentType: image.contentType,
        };
      }
      if (Date.now() >= deadline) {
        return {};
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }

  // The worker posts its raw guess; the back reconciles it to a canonical
  // species, finishes the job and drops the stored image.
  @Post('jobs/:id/result')
  async submitResult(
    @CurrentWorker() worker: Worker,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('species') species: string | null,
  ): Promise<{ species: string | null }> {
    const reconciled = species
      ? await this.reconciler.reconcile(species)
      : null;
    const imageKey = await this.jobs.complete(worker.userId, id, reconciled);
    if (imageKey !== undefined) {
      await this.storage.remove(imageKey);
    }
    return { species: reconciled };
  }

  @Post('jobs/:id/failed')
  @HttpCode(204)
  async submitFailure(
    @CurrentWorker() worker: Worker,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    const imageKey = await this.jobs.fail(worker.userId, id);
    if (imageKey !== undefined) {
      await this.storage.remove(imageKey);
    }
  }
}
