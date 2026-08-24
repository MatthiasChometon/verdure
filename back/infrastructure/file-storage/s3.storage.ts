import { randomUUID } from 'node:crypto';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileStorageService } from './service';

// S3-compatible driver (MinIO in Docker, or any S3 bucket). Selected by
// STORAGE_DRIVER=s3; otherwise the disk driver runs and none of the S3_* config
// is read, so a plain deploy needs no bucket at all.
@Injectable()
export class S3FileStorage extends FileStorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: ConfigService) {
    super();
    this.client = new S3Client({
      endpoint: config.getOrThrow<string>('S3_ENDPOINT'),
      region: config.getOrThrow<string>('S3_REGION'),
      credentials: {
        accessKeyId: config.getOrThrow<string>('S3_ACCESS_KEY'),
        secretAccessKey: config.getOrThrow<string>('S3_SECRET_KEY'),
      },
      forcePathStyle: config.get<string>('S3_FORCE_PATH_STYLE') === 'true',
    });
    this.bucket = config.getOrThrow<string>('S3_BUCKET');
  }

  async upload(body: Buffer, contentType: string): Promise<string> {
    const key = randomUUID();
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return key;
  }

  async remove(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async read(key: string): Promise<{ body: Uint8Array; contentType: string }> {
    const object = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (object.Body === undefined) {
      throw new NotFoundException('Image not found.');
    }
    return {
      body: await object.Body.transformToByteArray(),
      contentType: object.ContentType ?? 'application/octet-stream',
    };
  }
}
