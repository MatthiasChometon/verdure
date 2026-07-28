import { BadRequestException, Injectable } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { UploadedImage } from './type';

// Reads a single uploaded image off a multipart request, rejecting a missing
// file or a non-image mimetype. Shared by every endpoint that takes a photo.
@Injectable()
export class ImageUpload {
  async read(request: FastifyRequest): Promise<UploadedImage> {
    const file = await request.file();
    if (file === undefined) {
      throw new BadRequestException('No file provided.');
    }
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed.');
    }
    return { buffer: await file.toBuffer(), mimetype: file.mimetype };
  }
}
