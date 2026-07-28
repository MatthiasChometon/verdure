import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import sharp from 'sharp';

@Injectable()
export class IdentificationService {
  private readonly logger = new Logger(IdentificationService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.baseUrl = config.get<string>('VISION_URL') ?? 'http://127.0.0.1:8000';
  }

  // Identify a plant from a photo via the local vision API (wraps ComfyUI).
  // Best-effort: returns the raw scientific name it proposes, or null on any
  // failure. The service queues behind ComfyUI generations and retries a
  // transient crash internally, hence the long timeout.
  async identifyPlant(image: Buffer): Promise<string | undefined> {
    const jpeg = await this.toJpeg(image);
    if (jpeg === undefined) {
      return;
    }
    try {
      const { data } = await firstValueFrom(
        this.http.post<{ species?: string | null }>(
          `${this.baseUrl}/identify`,
          { image: jpeg.toString('base64') },
          { timeout: 330_000 },
        ),
      );
      const species =
        typeof data.species === 'string' ? data.species.trim() : '';
      if (species === '' || species.toLowerCase() === 'none') {
        return;
      }
      return species;
    } catch (error) {
      this.logger.warn(`Plant identification failed: ${String(error)}`);
      return;
    }
  }

  // Vision decoders choke on AVIF/WebP/HEIC, so normalise any upload to a
  // modest, EXIF-oriented JPEG and downscale it (640px) to keep the model fast.
  private async toJpeg(image: Buffer): Promise<Buffer | undefined> {
    try {
      return await sharp(image)
        .rotate()
        .resize(640, 640, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
    } catch (error) {
      this.logger.warn(`Image conversion failed: ${String(error)}`);
      return;
    }
  }
}
