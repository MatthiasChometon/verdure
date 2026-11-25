import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { FileStorageService } from '../../../infrastructure/file-storage/service';
import { ImageUpload } from '../../../infrastructure/http/image-upload';
import { AuthGuard } from '../../auth/currentUser/guard';
import { SkipTimeout } from '../../../infrastructure/http/request-timeout.interceptor';

// Uploaded before the report is sent; returns the storage key the report carries.
@Controller('uploads')
// Exempt from the global request timeout: a 408 would not stop the work, and
// the caller would resend what the first attempt still commits. Bounded by the upload limit.
@SkipTimeout()
@UseGuards(AuthGuard)
export class BugImageUploadController {
  constructor(
    private readonly storage: FileStorageService,
    private readonly imageUpload: ImageUpload,
  ) {}

  @Post('bug-image')
  async uploadImage(@Req() request: FastifyRequest): Promise<{ key: string }> {
    const image = await this.imageUpload.read(request);
    const key = await this.storage.upload(image.buffer, image.mimetype);
    return { key };
  }
}
