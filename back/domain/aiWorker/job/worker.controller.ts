import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { RecognitionJobRepository } from './repository';
import type { NextJob } from './type';

@Controller('worker')
@UseGuards(WorkerGuard)
export class WorkerChannelController {
  // Comfortably under a typical proxy idle kill; each reconnect also refreshes "online" status.
  private readonly longPollMs: number;
  private readonly pollIntervalMs: number;

  constructor(
    private readonly jobs: RecognitionJobRepository,
    private readonly storage: FileStorageService,
    private readonly reconciler: SpeciesReconciler,
    private readonly embedding: SemanticEmbeddingService,
    private readonly tokens: WorkerTokenRepository,
    private readonly diagnoses: DiagnosisJobRepository,
    config: ConfigService,
  ) {
    this.longPollMs =
      Number(config.get<string>('AI_WORKER_LONG_POLL_MS')) || 25_000;
    this.pollIntervalMs =
      Number(config.get<string>('AI_WORKER_POLL_INTERVAL_MS')) || 1_000;
  }

  // The held connection doubles as a liveness signal: a socket close marks the worker
  // offline immediately, without waiting for the heartbeat window (a plain timeout is not a drop).
  @Get('next-job')
  async nextJob(
    @CurrentWorker() worker: Worker,
    @Req() request: FastifyRequest,
  ): Promise<NextJob> {
    let dropped = false;
    const onClose = (): void => {
      dropped = true;
    };
    request.raw.on('close', onClose);
    try {
      const deadline = Date.now() + this.longPollMs;
      for (;;) {
        if (dropped) {
          await this.tokens.markOffline(worker.tokenId);
          return {};
        }
        const claimed = await this.jobs.claimNext(worker.userId);
        if (claimed !== undefined) {
          if ((claimed.kind as JobKind) === JobKind.EMBED) {
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
        await new Promise((resolve) =>
          setTimeout(resolve, this.pollIntervalMs),
        );
      }
    } finally {
      // Removed before the response's own close fires, so a normal return is
      // never mistaken for a drop.
      request.raw.removeListener('close', onClose);
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
    if (imageKey != null) {
      await this.storage.remove(imageKey);
    }
    return { species: reconciled };
  }

  // The worker posts its free-text health assessment; the back stores it and
  // finishes the job. The photo belongs to the plant, so it is kept.
  @Post('jobs/:id/diagnosis')
  @HttpCode(204)
  async submitDiagnosis(
    @CurrentWorker() worker: Worker,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('diagnosis') diagnosis: string,
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
    @Body('embedding') embedding: number[],
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
    if (imageKey != null) {
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
