import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  OnModuleDestroy,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { positiveIntegerSetting } from '../../../infrastructure/config/env';
import type { FastifyRequest } from 'fastify';
import { FileStorageService } from '../../../infrastructure/file-storage/service';
import { SpeciesReconciler } from '../../species/reconciler';
import { DiagnosisJobRepository } from '../diagnosis/repository';
import { SemanticEmbeddingService } from '../embedding/service';
import { CurrentWorker } from '../token/current-worker';
import { WorkerGuard } from '../token/guard';
import { WorkerTokenRepository } from '../token/repository';
import type { Worker } from '../token/type';
import { JobKind } from './enum';
import {
  SubmitDiagnosisInput,
  SubmitEmbeddingInput,
  SubmitResultInput,
} from './input';
import { RecognitionJobRepository } from './repository';
import type { NextJob } from './type';

const DEFAULT_LONG_POLL_MS = 25_000;
const DEFAULT_POLL_INTERVAL_MS = 1_000;

@Controller('worker')
@UseGuards(WorkerGuard)
export class WorkerChannelController implements OnModuleDestroy {
  // Comfortably under a typical proxy idle kill; each reconnect also refreshes "online" status.
  private readonly longPollMs: number;
  private readonly pollIntervalMs: number;
  // Set once the server is stopping: held polls answer empty instead of querying
  // a database that is about to close.
  private stopping = false;
  private readonly polls = new Set<Promise<NextJob>>();
  private readonly sleepers = new Set<() => void>();

  constructor(
    private readonly jobs: RecognitionJobRepository,
    private readonly storage: FileStorageService,
    private readonly reconciler: SpeciesReconciler,
    private readonly embedding: SemanticEmbeddingService,
    private readonly tokens: WorkerTokenRepository,
    private readonly diagnoses: DiagnosisJobRepository,
    config: ConfigService,
  ) {
    this.longPollMs = positiveIntegerSetting(
      config,
      'AI_WORKER_LONG_POLL_MS',
      DEFAULT_LONG_POLL_MS,
    );
    this.pollIntervalMs = positiveIntegerSetting(
      config,
      'AI_WORKER_POLL_INTERVAL_MS',
      DEFAULT_POLL_INTERVAL_MS,
    );
  }

  // Held polls end at once (the worker simply reconnects) and the pool is only
  // ended after the last one has answered.
  async onModuleDestroy(): Promise<void> {
    this.stopping = true;
    for (const wake of this.sleepers) {
      wake();
    }
    await Promise.allSettled([...this.polls]);
  }

  // The held connection doubles as a liveness signal: a socket close marks the worker
  // offline immediately, without waiting for the heartbeat window (a plain timeout is not a drop).
  @Get('next-job')
  async nextJob(
    @CurrentWorker() worker: Worker,
    @Req() request: FastifyRequest,
  ): Promise<NextJob> {
    const poll = this.holdPoll(worker, request);
    this.polls.add(poll);
    try {
      return await poll;
    } finally {
      this.polls.delete(poll);
    }
  }

  private async holdPoll(
    worker: Worker,
    request: FastifyRequest,
  ): Promise<NextJob> {
    let dropped = false;
    const onClose = (): void => {
      dropped = true;
    };
    request.raw.on('close', onClose);
    try {
      const deadline = Date.now() + this.longPollMs;
      for (;;) {
        if (this.stopping) {
          return {};
        }
        if (dropped) {
          await this.tokens.markOffline(worker.tokenId);
          return {};
        }
        const claimed = await this.jobs.claimNext(worker.userId);
        if (claimed !== undefined) {
          if (claimed.kind === JobKind.EMBED) {
            return {
              jobId: claimed.id,
              kind: JobKind.EMBED,
              text: claimed.inputText ?? '',
            };
          }
          // identify and diagnose both ship the photo; the kind tells the worker
          // whether to name the species or assess its health.
          const image = await this.storage.read(claimed.imageKey ?? '');
          return {
            jobId: claimed.id,
            kind: claimed.kind,
            image: Buffer.from(image.body).toString('base64'),
            contentType: image.contentType,
          };
        }
        if (Date.now() >= deadline) {
          return {};
        }
        // Real new backfill work -> claim it immediately; otherwise wait.
        if (await this.embedding.enqueueBackfill(worker.userId)) {
          continue;
        }
        await this.sleep();
      }
    } finally {
      // Removed before the response's own close fires, so a normal return is
      // never mistaken for a drop.
      request.raw.removeListener('close', onClose);
    }
  }

  // The wait between two looks at the queue, cut short by the shutdown.
  private sleep(): Promise<void> {
    return new Promise<void>((resolve) => {
      const wake = (): void => {
        clearTimeout(timer);
        this.sleepers.delete(wake);
        resolve();
      };
      const timer = setTimeout(wake, this.pollIntervalMs);
      this.sleepers.add(wake);
    });
  }

  // The worker posts its raw guess; the back reconciles it to a canonical
  // species, finishes the job and drops the stored image.
  @Post('jobs/:id/result')
  async submitResult(
    @CurrentWorker() worker: Worker,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() { species }: SubmitResultInput,
  ): Promise<{ species: string | null }> {
    const reconciled = species
      ? await this.reconciler.reconcile(species)
      : undefined;
    const imageKey = await this.jobs.complete(worker.userId, id, reconciled);
    if (imageKey !== undefined) {
      await this.storage.remove(imageKey);
    }
    // The worker REST contract answers a null species, not an absent field.
    return { species: reconciled ?? null };
  }

  // The worker posts its free-text health assessment; the back stores it and
  // finishes the job. The photo belongs to the plant, so it is kept.
  @Post('jobs/:id/diagnosis')
  @HttpCode(204)
  async submitDiagnosis(
    @CurrentWorker() worker: Worker,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() { diagnosis }: SubmitDiagnosisInput,
  ): Promise<void> {
    await this.diagnoses.complete(worker.userId, id, diagnosis);
  }

  // The worker posts an embed job's vector; the back stores it on the plant (a
  // backfill/save) or in the query cache (a search), per the job's target.
  @Post('jobs/:id/embedding')
  @HttpCode(204)
  async submitEmbedding(
    @CurrentWorker() worker: Worker,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() { embedding }: SubmitEmbeddingInput,
  ): Promise<void> {
    const target = await this.jobs.completeEmbedding(
      worker.userId,
      id,
      embedding,
    );
    if (target !== undefined) {
      await this.embedding.applyEmbeddingResult(
        worker.userId,
        target,
        embedding,
      );
    }
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

  // A diagnose job failed. Same as /failed but the plant keeps its photo, so the
  // worker reports diagnose failures here rather than to /failed.
  @Post('jobs/:id/diagnosis-failed')
  @HttpCode(204)
  async submitDiagnosisFailure(
    @CurrentWorker() worker: Worker,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.diagnoses.fail(worker.userId, id);
  }
}
