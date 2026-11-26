import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import sharp from 'sharp';
import { VariantWidth, variantKey } from './image-variants';
import { FileStorageService } from './service';

const WEBP = 'image/webp';
const WEBP_QUALITY = 78;
// A shared host has little memory: refuse to decode a picture bigger than 40 megapixels (a
// decompression bomb, or a very large panorama) and read the pixels row by row.
const MAX_INPUT_PIXELS = 40_000_000;

type Variant = { body: Uint8Array; contentType: string };

// Reads a resized copy of an image from the storage, making and storing it the first time it is
// asked for (lazy backfill: existing uploads need no migration). If the file cannot be decoded
// as an image, the original is returned as is.
@Injectable()
export class ImageVariants {
  private readonly logger = new Logger(ImageVariants.name);
  // First requests for the same image and width share one run; this is per process, which is
  // enough because the result is stored and a second process only repeats a cheap resize.
  private readonly inFlight = new Map<string, Promise<Variant | undefined>>();
  // At most one decode and resize at a time, the others wait their turn.
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly storage: FileStorageService) {}

  read(key: string, width: VariantWidth): Promise<Variant | undefined> {
    const target = variantKey(key, width);
    const running = this.inFlight.get(target);
    if (running !== undefined) {
      return running;
    }
    const started = this.load(key, width, target).finally(() =>
      this.inFlight.delete(target),
    );
    this.inFlight.set(target, started);
    return started;
  }

  private async load(
    key: string,
    width: VariantWidth,
    target: string,
  ): Promise<Variant | undefined> {
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
    const resized = await this.enqueue(() => this.resize(original.body, width));
    if (resized === undefined) {
      return original;
    }
    await this.storage.upload(resized, WEBP, target);
    return { body: resized, contentType: WEBP };
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task);
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async resize(
    body: Uint8Array,
    width: VariantWidth,
  ): Promise<Buffer | undefined> {
    try {
      return await sharp(body, {
        limitInputPixels: MAX_INPUT_PIXELS,
        sequentialRead: true,
      })
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
