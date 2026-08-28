import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { FastifyRequest } from 'fastify';
import { FileStorageService } from '../../../infrastructure/file-storage/service';
import { ImageUpload } from '../../../infrastructure/http/image-upload';
import { PlantNetService } from '../../../infrastructure/plant-recognition/plantnet.service';
import { CurrentUser } from '../../auth/currentUser/current-user';
import { AuthGuard } from '../../auth/currentUser/guard';
import { User } from '../../user/model';
import { RecognitionJobRepository } from './repository';
import { WorkerTokenRepository } from '../token/repository';

@Controller('uploads')
// Rate-limited (ThrottlerModule default: 20/min) to stop a flood of uploads
// spamming the queue and image store.
@UseGuards(AuthGuard, ThrottlerGuard)
export class RecognitionRequestController {
  constructor(
    private readonly jobs: RecognitionJobRepository,
    private readonly storage: FileStorageService,
    private readonly imageUpload: ImageUpload,
    private readonly workers: WorkerTokenRepository,
    private readonly plantNet: PlantNetService,
  ) {}

  // Queue a plant photo for recognition. The `mode` query param (set by the app,
  // remembered per device) picks the engine:
  //   auto  (default) — Pl@ntNet: it is faster and more accurate at plants than
  //                     the local general VLM, so it is the default even when a
  //                     worker is online (the worker's job is semantic search);
  //   cloud           — Pl@ntNet;
  //   local           — the user's worker only, never the cloud (privacy).
  // Only `local` hands off to the worker (it claims the PENDING job); the cloud
  // path resolves it here and now. Either way the app polls identificationJob.
  @Post('request-identification')
  async requestIdentification(
    @CurrentUser() user: User,
    @Req() request: FastifyRequest,
  ): Promise<{ jobId: string }> {
    const mode = (request.query as { mode?: string }).mode ?? 'auto';
    const image = await this.imageUpload.read(request);
    const imageKey = await this.storage.upload(image.buffer, image.mimetype);
    const jobId = await this.jobs.enqueue(user.id, imageKey);

    // Only the explicit "my PC" choice runs on the worker, and only if one is
    // online: it claims the PENDING job and processes it privately.
    if (mode === 'local' && (await this.workers.isOnline(user.id))) {
      return { jobId };
    }

    // "My PC only" but no worker online: fail rather than fall back to the cloud,
    // so the privacy choice holds (the app shows the "connect your PC" hint).
    // Otherwise (cloud, or auto with no worker) identify via Pl@ntNet here.
    const species =
      mode === 'local'
        ? null
        : await this.plantNet.identify(image.buffer, image.mimetype);
    const spentKey =
      species !== null
        ? await this.jobs.complete(user.id, jobId, species)
        : await this.jobs.fail(user.id, jobId);
    // The photo has served its purpose (Pl@ntNet already saw it); drop it.
    if (spentKey != null) {
      await this.storage.remove(spentKey);
    }

    return { jobId };
  }
}
