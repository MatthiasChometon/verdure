import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { FileStorageService } from '../../../infrastructure/file-storage/service';
import { ImageUpload } from '../../../infrastructure/http/image-upload';
import { AuthGuard } from '../../auth/currentUser/guard';

@Controller('uploads')
@UseGuards(AuthGuard)
export class UploadController {
  constructor(
    private readonly storage: FileStorageService,
    private readonly imageUpload: ImageUpload,
  ) {}

  @Post('plant-image')
  async uploadImage(@Req() request: FastifyRequest): Promise<{ key: string }> {
    const image = await this.imageUpload.read(request);
    const key = await this.storage.upload(image.buffer, image.mimetype);
    return { key };
  }
}
