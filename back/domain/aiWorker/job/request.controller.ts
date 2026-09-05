import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { FastifyRequest } from 'fastify';
import { FileStorageService } from '../../../infrastructure/file-storage/service';
import { ImageUpload } from '../../../infrastructure/http/image-upload';
import type { UploadedImage } from '../../../infrastructure/http/type';
import { PlantNetService } from '../../../infrastructure/plant-recognition/plantnet.service';
import { CurrentUser } from '../../auth/currentUser/current-user';
import { AuthGuard } from '../../auth/currentUser/guard';
import { User } from '../../user/model';
import { UserRepository } from '../../user/repository';
import { SharedQuotaRepository } from '../quota/repository';
import { RecognitionJobRepository } from './repository';
import { WorkerTokenRepository } from '../token/repository';

type CloudOutcome = { species: string | null; reason: string | null };

@Controller('uploads')
// Rate-limited (ThrottlerModule default: 20/min) to stop a flood of uploads
// spamming the queue and image store.
@UseGuards(AuthGuard, ThrottlerGuard)
export class RecognitionRequestController {
  // Daily cap so nobody drains the shared Pl@ntNet quota; users with their own key are exempt.
  private readonly sharedDailyLimit: number;

  constructor(
    private readonly jobs: RecognitionJobRepository,
    private readonly storage: FileStorageService,
    private readonly imageUpload: ImageUpload,
    private readonly workers: WorkerTokenRepository,
    private readonly plantNet: PlantNetService,
    private readonly users: UserRepository,
    private readonly quota: SharedQuotaRepository,
    config: ConfigService,
  ) {
    this.sharedDailyLimit =
      Number(config.get<string>('PLANTNET_SHARED_DAILY_LIMIT')) || 30;
  }

  // `mode`: auto/cloud go to Pl@ntNet (more accurate than the local VLM); local never falls
  // back to cloud (privacy). Either way the app polls identificationJob.
  @Post('request-identification')
  async requestIdentification(
    @CurrentUser() user: User,
    @Req() request: FastifyRequest,
  ): Promise<{ jobId: string }> {
    const mode = this.parseMode(request);
    const image = await this.imageUpload.read(request);
    const imageKey = await this.storage.upload(image.buffer, image.mimetype);
    const jobId = await this.jobs.enqueue(user.id, imageKey);

    if (await this.claimByWorkerIfLocal(mode, user.id)) {
      return { jobId };
    }

    const { species, reason } = await this.resolveViaCloud(
      mode,
      image,
      user.id,
    );
    if (
      species === null &&
      (await this.shouldFallBackToWorker(reason, user.id))
    ) {
      return { jobId };
    }

    await this.finishJob(user.id, jobId, species, reason);
    return { jobId };
  }

  private parseMode(request: FastifyRequest): string {
    return (request.query as { mode?: string }).mode ?? 'auto';
  }

  // Only the explicit "my PC" choice runs on the worker, and only if one is
  // online: it claims the PENDING job and processes it privately.
  private async claimByWorkerIfLocal(
    mode: string,
    userId: string,
  ): Promise<boolean> {
    return mode === 'local' && (await this.workers.isOnline(userId));
  }

  // Cloud (auto/cloud) → Pl@ntNet. "local" with no worker just fails (no cloud
  // fallback: the privacy choice holds, the app shows the "connect PC" hint).
  private async resolveViaCloud(
    mode: string,
    image: UploadedImage,
    userId: string,
  ): Promise<CloudOutcome> {
    if (mode === 'local') {
      return { species: null, reason: null };
    }
    const userKey = await this.users.plantnetKeyOf(userId);
    if (userKey === null && !this.plantNet.hasSharedKey()) {
      // No cloud key at all (e.g. a fresh dev checkout): tell the user how to
      // enable it rather than pretending the quota is exhausted.
      return { species: null, reason: 'not-configured' };
    }
    if (
      userKey === null &&
      (await this.quota.bumpToday(userId)) > this.sharedDailyLimit
    ) {
      // Over the shared-key daily cap: don't spend the shared quota. The user
      // can add their own Pl@ntNet key or use their PC.
      return { species: null, reason: 'limit' };
    }
    const result = await this.plantNet.identify(
      image.buffer,
      image.mimetype,
      userKey,
    );
    // Exhausted quota / rejected key / outage — worth telling the user.
    return {
      species: result.species,
      reason: result.available ? null : 'quota',
    };
  }

  // Cloud blocked but a worker is online: hand it the still-PENDING job instead of failing.
  private async shouldFallBackToWorker(
    reason: string | null,
    userId: string,
  ): Promise<boolean> {
    return (
      (reason === 'quota' ||
        reason === 'limit' ||
        reason === 'not-configured') &&
      (await this.workers.isOnline(userId))
    );
  }

  private async finishJob(
    userId: string,
    jobId: string,
    species: string | null,
    reason: string | null,
  ): Promise<void> {
    const spentKey =
      species !== null
        ? await this.jobs.complete(userId, jobId, species)
        : await this.jobs.fail(userId, jobId, reason);
    // The photo has served its purpose (Pl@ntNet already saw it); drop it.
    if (spentKey != null) {
      await this.storage.remove(spentKey);
    }
  }
}
