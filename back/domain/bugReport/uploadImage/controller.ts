import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { FileStorageService } from '../../../infrastructure/file-storage/service';
import { ImageUpload } from '../../../infrastructure/http/image-upload';
import { AuthGuard } from '../../auth/currentUser/guard';

// A screenshot is uploaded on its own, before the report is sent, and comes back
// as a storage key the report then carries. Signed in, like the report itself:
// anybody using the site may attach one, nobody anonymous may fill the store.
@Controller('uploads')
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
