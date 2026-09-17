import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/module';
import { PlantCareModule } from '../plantCare/module';
import { UserModule } from '../user/module';
import { WateringModule } from '../watering/module';
import { CalendarFeedController } from './controller';
import { CalendarFeedService } from './feed.service';
import { CalendarFeedResolver } from './resolver';
import { CalendarFeedTokenRepository } from './token-repository';

@Module({
  imports: [AuthModule, UserModule, WateringModule, PlantCareModule],
  controllers: [CalendarFeedController],
  providers: [
    CalendarFeedResolver,
    CalendarFeedService,
    CalendarFeedTokenRepository,
  ],
})
export class CalendarFeedModule {}
