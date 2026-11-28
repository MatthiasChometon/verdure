import { Injectable } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

export type ImageUrlRequest = Pick<FastifyRequest, 'protocol' | 'headers'>;

// Images are served by the API itself (`ImageController`) on the host the
// browser used, so a URL works over localhost and the LAN alike, and the raw
// storage key never reaches the client as such.
@Injectable()
export class ImageUrl {
  for(
    imageKey: string | null | undefined,
    request: ImageUrlRequest,
  ): string | null {
    if (imageKey === null || imageKey === undefined) {
      return null;
    }
    return `${request.protocol}://${request.headers.host}/images/${imageKey}`;
  }
}
