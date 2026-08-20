import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { FileStorageService } from '../../../infrastructure/file-storage/service';
import { ImageUpload } from '../../../infrastructure/http/image-upload';
import { CurrentUser } from '../../auth/currentUser/current-user';
import { AuthGuard } from '../../auth/currentUser/guard';
import { User } from '../../user/model';
import { RecognitionJobRepository } from './repository';

@Controller('uploads')
@UseGuards(AuthGuard)
export class RecognitionRequestController {
  constructor(
    private readonly jobs: RecognitionJobRepository,
    private readonly storage: FileStorageService,
    private readonly imageUpload: ImageUpload,
  ) {}

  // Queue a plant photo for the user's own local AI worker to recognise.
  // Returns the job id; the app then polls `identificationJob(id)`.
  @Post('request-identification')
  async requestIdentification(
    @CurrentUser() user: User,
    @Req() request: FastifyRequest,
  ): Promise<{ jobId: string }> {
    const image = await this.imageUpload.read(request);
    const imageKey = await this.storage.upload(image.buffer, image.mimetype);
    const jobId = await this.jobs.enqueue(user.id, imageKey);
    return { jobId };
  }
}
