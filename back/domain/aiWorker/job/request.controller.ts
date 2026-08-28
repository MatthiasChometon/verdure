import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { FastifyRequest } from 'fastify';
import { FileStorageService } from '../../../infrastructure/file-storage/service';
import { ImageUpload } from '../../../infrastructure/http/image-upload';
import { PlantNetService } from '../../../infrastructure/plant-recognition/plantnet.service';
import { CurrentUser } from '../../auth/currentUser/current-user';
import { AuthGuard } from '../../auth/currentUser/guard';
import { User } from '../../user/model';
import { UserRepository } from '../../user/repository';
import { SharedQuotaRepository } from '../quota/repository';
import { RecognitionJobRepository } from './repository';
import { WorkerTokenRepository } from '../token/repository';

// How many shared-key identifications one user may run per day, so nobody can
// drain (or spam) the shared Pl@ntNet quota. Users with their own key are exempt.
const SHARED_DAILY_LIMIT =
  Number(process.env.PLANTNET_SHARED_DAILY_LIMIT) || 30;

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
    private readonly users: UserRepository,
    private readonly quota: SharedQuotaRepository,
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

    // Cloud (auto/cloud) → Pl@ntNet. "local" with no worker just fails (no cloud
    // fallback: the privacy choice holds, the app shows the "connect PC" hint).
    let species: string | null = null;
    let reason: string | null = null;
    if (mode !== 'local') {
      const userKey = await this.users.plantnetKeyOf(user.id);
      if (
        userKey === null &&
        (await this.quota.bumpToday(user.id)) > SHARED_DAILY_LIMIT
      ) {
        // Over the shared-key daily cap: don't spend the shared quota. The user
        // can add their own Pl@ntNet key or use their PC.
        reason = 'limit';
      } else {
        const result = await this.plantNet.identify(
          image.buffer,
          image.mimetype,
          userKey,
        );
        species = result.species;
        // Exhausted quota / rejected key / outage — worth telling the user.
        if (!result.available) {
          reason = 'quota';
        }
      }
    }
    const spentKey =
      species !== null
        ? await this.jobs.complete(user.id, jobId, species)
        : await this.jobs.fail(user.id, jobId, reason);
    // The photo has served its purpose (Pl@ntNet already saw it); drop it.
    if (spentKey != null) {
      await this.storage.remove(spentKey);
    }

    return { jobId };
  }
}
