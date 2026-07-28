import { randomUUID } from 'node:crypto';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  type S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3_CLIENT, S3_PRESIGN_CLIENT } from './token';

@Injectable()
export class FileStorageService {
  private readonly bucket: string;

  constructor(
    @Inject(S3_CLIENT) private readonly client: S3Client,
    @Inject(S3_PRESIGN_CLIENT) private readonly presignClient: S3Client,
    config: ConfigService,
  ) {
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

  getSignedUrl(key: string): Promise<string> {
    return getSignedUrl(
      this.presignClient,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      {
        expiresIn: 3600,
      },
    );
  }
}
