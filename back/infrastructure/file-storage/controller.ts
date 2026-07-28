import { Controller, Get, Param, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { FileStorageService } from './service';

@Controller('images')
export class ImageController {
  constructor(private readonly storage: FileStorageService) {}

  // Public — the key is an unguessable UUID. Serving images from the API (not
  // the object store directly) keeps them on the same host/port as everything
  // else, so they load over localhost and the LAN without extra ports.
  @Get(':key')
  async image(
    @Param('key') key: string,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const { body, contentType } = await this.storage.read(key);
    reply
      .header('Content-Type', contentType)
      .header('Cache-Control', 'private, max-age=3600')
      .send(Buffer.from(body));
  }
}
