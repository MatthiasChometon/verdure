import { Module } from '@nestjs/common';
import { WebPushService } from './service';

@Module({
  providers: [WebPushService],
  exports: [WebPushService],
})
export class PushInfrastructureModule {}
