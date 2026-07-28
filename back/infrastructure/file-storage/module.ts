import { S3Client } from '@aws-sdk/client-s3';
import { Global, Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileStorageService } from './service';
import { S3_CLIENT, S3_PRESIGN_CLIENT } from './token';

const createClient = (config: ConfigService, endpoint: string): S3Client =>
  new S3Client({
    endpoint,
    region: config.getOrThrow<string>('S3_REGION'),
    credentials: {
      accessKeyId: config.getOrThrow<string>('S3_ACCESS_KEY'),
      secretAccessKey: config.getOrThrow<string>('S3_SECRET_KEY'),
    },
    forcePathStyle: config.get<string>('S3_FORCE_PATH_STYLE') === 'true',
  });

// Server-side reads/writes reach the storage over the internal network.
const s3ClientProvider: Provider = {
  provide: S3_CLIENT,
  useFactory: (config: ConfigService): S3Client =>
    createClient(config, config.getOrThrow<string>('S3_ENDPOINT')),
  inject: [ConfigService],
};

// Presigned URLs are opened by the browser, so they are signed against the
// public endpoint — which defaults to the internal one when it is the same
// host (e.g. a local run without Docker's container/host split).
const s3PresignClientProvider: Provider = {
  provide: S3_PRESIGN_CLIENT,
  useFactory: (config: ConfigService): S3Client =>
    createClient(
      config,
      config.get<string>('S3_PUBLIC_ENDPOINT') ??
        config.getOrThrow<string>('S3_ENDPOINT'),
    ),
  inject: [ConfigService],
};

@Global()
@Module({
  providers: [s3ClientProvider, s3PresignClientProvider, FileStorageService],
  exports: [FileStorageService],
})
export class FileStorageInfrastructureModule {}
