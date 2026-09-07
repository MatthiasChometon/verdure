import { Module } from '@nestjs/common';
import { PushInfrastructureModule } from '../../infrastructure/push/module';
import { PlantCareModule } from '../plantCare/module';
import { PushSubscriptionModule } from '../pushSubscription/module';
import { UserModule } from '../user/module';
import { WateringModule } from '../watering/module';
import { CareReminderMessage } from './care-message';
import { ReminderMessage } from './message';
import { WateringReminderService } from './reminder.service';
import { WateringReminderScheduler } from './scheduler';

@Module({
  imports: [
    WateringModule,
    PlantCareModule,
    PushSubscriptionModule,
    UserModule,
    PushInfrastructureModule,
  ],
  providers: [
    WateringReminderService,
    WateringReminderScheduler,
    ReminderMessage,
    CareReminderMessage,
  ],
})
export class WateringReminderModule {}
