import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { ImageVariants } from './image-variants.service';
import { VARIANT_WIDTHS, isVariantWidth } from './image-variants';
import { FileStorageService } from './service';

@Controller('images')
export class ImageController {
  constructor(
    private readonly storage: FileStorageService,
    private readonly variants: ImageVariants,
  ) {}

  // Public: key is an unguessable UUID. Serving via the API (not the store
  // directly) keeps images on the same host/port, reachable over the LAN too.
  // `?w=480|960|1280` asks for a resized WebP copy (made on the first request);
  // without it the original is sent unchanged.
  @Get(':key')
  async image(
    @Param('key', ParseUUIDPipe) key: string,
    @Res() reply: FastifyReply,
    @Query('w') requestedWidth?: string,
  ): Promise<void> {
    const { body, contentType } = await this.read(key, requestedWidth);
    reply
      .header('Content-Type', contentType)
      // Key is an immutable UUID (a new image gets a new key), so this
      // content never changes: cache it hard, a year, no revalidation.
      .header('Cache-Control', 'private, max-age=31536000, immutable')
      .send(Buffer.from(body));
  }

  private async read(
    key: string,
    requestedWidth: string | undefined,
  ): Promise<{ body: Uint8Array; contentType: string }> {
    if (requestedWidth === undefined) {
      return this.storage.read(key);
    }
    const width = Number(requestedWidth);
    if (!isVariantWidth(width)) {
      throw new BadRequestException(
        `Width must be one of ${VARIANT_WIDTHS.join(', ')}.`,
      );
    }
    const variant = await this.variants.read(key, width);
    if (variant === undefined) {
      throw new NotFoundException('Image not found.');
    }
    return variant;
  }
}
