import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import sharp from 'sharp';
import { VariantWidth, variantKey } from './image-variants';
import { FileStorageService } from './service';

const WEBP = 'image/webp';
const WEBP_QUALITY = 78;

// Reads a resized copy of an image from the storage, making and storing it the first time it is
// asked for (lazy backfill: existing uploads need no migration). If the file cannot be decoded
// as an image, the original is returned as is.
@Injectable()
export class ImageVariants {
  private readonly logger = new Logger(ImageVariants.name);

  constructor(private readonly storage: FileStorageService) {}

  async read(
    key: string,
    width: VariantWidth,
  ): Promise<{ body: Uint8Array; contentType: string } | undefined> {
    const target = variantKey(key, width);
    try {
      return await this.storage.read(target);
    } catch (error) {
      if (!(error instanceof NotFoundException) && !isMissingObject(error)) {
        throw error;
      }
    }
    const original = await this.storage.read(key).catch((error: unknown) => {
      if (error instanceof NotFoundException || isMissingObject(error)) {
        return undefined;
      }
      throw error;
    });
    if (original === undefined) {
      return undefined;
    }
    const resized = await this.resize(original.body, width);
    if (resized === undefined) {
      return original;
    }
    await this.storage.upload(resized, WEBP, target);
    return { body: resized, contentType: WEBP };
  }

  private async resize(
    body: Uint8Array,
    width: VariantWidth,
  ): Promise<Buffer | undefined> {
    try {
      return await sharp(body)
        .rotate()
        .resize(width, width, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
    } catch (error) {
      this.logger.warn(`Image resize failed: ${String(error)}`);
      return undefined;
    }
  }
}

// The S3 driver lets the SDK's "no such key" error through; both drivers mean "not stored".
const isMissingObject = (error: unknown): boolean =>
  error instanceof Error &&
  (error.name === 'NoSuchKey' || error.name === 'NotFound');
