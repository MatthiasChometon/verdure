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

  // Queue a plant photo for recognition. If the user has a local AI worker
  // online, it takes priority — recognition runs privately on their own GPU and
  // the job stays PENDING for the worker to claim. Otherwise we identify it
  // right here via Pl@ntNet, so recognition works for everyone with no install.
  // Either way the app polls `identificationJob(id)` for the result.
  @Post('request-identification')
  async requestIdentification(
    @CurrentUser() user: User,
    @Req() request: FastifyRequest,
  ): Promise<{ jobId: string }> {
    const image = await this.imageUpload.read(request);
    const imageKey = await this.storage.upload(image.buffer, image.mimetype);
    const jobId = await this.jobs.enqueue(user.id, imageKey);

    if (!(await this.workers.isOnline(user.id))) {
      const species = await this.plantNet.identify(
        image.buffer,
        image.mimetype,
      );
      const spentKey =
        species !== null
          ? await this.jobs.complete(user.id, jobId, species)
          : await this.jobs.fail(user.id, jobId);
      // The photo has served its purpose (Pl@ntNet already saw it); drop it.
      if (spentKey !== undefined) {
        await this.storage.remove(spentKey);
      }
    }

    return { jobId };
  }
}
