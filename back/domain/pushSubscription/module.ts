import { Module } from '@nestjs/common';
import { PushInfrastructureModule } from '../../infrastructure/push/module';
import { AuthModule } from '../auth/module';
import { PushSubscriptionRepository } from './repository';
import { PushSubscriptionResolver } from './resolver';

@Module({
  imports: [AuthModule, PushInfrastructureModule],
  providers: [PushSubscriptionResolver, PushSubscriptionRepository],
  exports: [PushSubscriptionRepository],
})
export class PushSubscriptionModule {}
