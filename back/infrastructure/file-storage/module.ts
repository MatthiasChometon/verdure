import { Global, Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImageController } from './controller';
import { DiskFileStorage } from './disk.storage';
import { S3FileStorage } from './s3.storage';
import { FileStorageService } from './service';

// Disk is the default driver; STORAGE_DRIVER=s3 opts into S3/MinIO. Only the
// chosen driver is constructed, so unused S3_*/STORAGE_DIR config stays inert.
const storageProvider: Provider = {
  provide: FileStorageService,
  useFactory: (config: ConfigService): FileStorageService =>
    config.get<string>('STORAGE_DRIVER') === 's3'
      ? new S3FileStorage(config)
      : new DiskFileStorage(config),
  inject: [ConfigService],
};

@Global()
@Module({
  controllers: [ImageController],
  providers: [storageProvider],
  exports: [FileStorageService],
})
export class FileStorageInfrastructureModule {}
