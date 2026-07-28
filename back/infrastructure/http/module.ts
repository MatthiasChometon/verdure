import { Module } from '@nestjs/common';
import { ImageUpload } from './image-upload';

@Module({
  providers: [ImageUpload],
  exports: [ImageUpload],
})
export class HttpInfrastructureModule {}
