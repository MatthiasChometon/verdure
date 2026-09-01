import { Module } from '@nestjs/common';
import { PushInfrastructureModule } from '../../infrastructure/push/module';
import { PlantModule } from '../plant/module';
import { PushSubscriptionModule } from '../pushSubscription/module';
import { UserModule } from '../user/module';
import { ReminderMessage } from './message';
import { WateringReminderService } from './reminder.service';
import { WateringReminderScheduler } from './scheduler';

@Module({
  imports: [
    PlantModule,
    PushSubscriptionModule,
    UserModule,
    PushInfrastructureModule,
  ],
  providers: [
    WateringReminderService,
    WateringReminderScheduler,
    ReminderMessage,
  ],
})
export class WateringReminderModule {}
