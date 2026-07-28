import { S3Client } from '@aws-sdk/client-s3';
import { Global, Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImageController } from './controller';
import { FileStorageService } from './service';
import { S3_CLIENT } from './token';

const s3ClientProvider: Provider = {
  provide: S3_CLIENT,
  useFactory: (config: ConfigService): S3Client =>
    new S3Client({
      endpoint: config.getOrThrow<string>('S3_ENDPOINT'),
      region: config.getOrThrow<string>('S3_REGION'),
      credentials: {
        accessKeyId: config.getOrThrow<string>('S3_ACCESS_KEY'),
        secretAccessKey: config.getOrThrow<string>('S3_SECRET_KEY'),
      },
      forcePathStyle: config.get<string>('S3_FORCE_PATH_STYLE') === 'true',
    }),
  inject: [ConfigService],
};

@Global()
@Module({
  controllers: [ImageController],
  providers: [s3ClientProvider, FileStorageService],
  exports: [FileStorageService],
})
export class FileStorageInfrastructureModule {}
