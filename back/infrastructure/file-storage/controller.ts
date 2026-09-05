import { Controller, Get, Param, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { FileStorageService } from './service';

@Controller('images')
export class ImageController {
  constructor(private readonly storage: FileStorageService) {}

  // Public: key is an unguessable UUID. Serving via the API (not the store
  // directly) keeps images on the same host/port, reachable over the LAN too.
  @Get(':key')
  async image(
    @Param('key') key: string,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const { body, contentType } = await this.storage.read(key);
    reply
      .header('Content-Type', contentType)
      // Key is an immutable UUID (a new image gets a new key), so this
      // content never changes: cache it hard, a year, no revalidation.
      .header('Cache-Control', 'private, max-age=31536000, immutable')
      .send(Buffer.from(body));
  }
}
