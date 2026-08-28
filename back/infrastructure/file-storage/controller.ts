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
      // The key is an immutable UUID: a plant's new image gets a brand-new key
      // (and URL), so this content never changes. Cache it hard — a year, no
      // revalidation — so revisits and re-renders never re-fetch it.
      .header('Cache-Control', 'private, max-age=31536000, immutable')
      .send(Buffer.from(body));
  }
}
