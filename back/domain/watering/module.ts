import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/module';
import { PlantModule } from '../plant/module';
import { WateringDueService } from './due.service';
import { WateringRepository } from './repository';
import { WateringResolver } from './resolver';
import { WateringScheduleService } from './schedule.service';

// Watering leans on the plant core (save/read helpers) and the core in turn
// resolves watering fields on Plant — hence the mutual forwardRef.
@Module({
  imports: [AuthModule, forwardRef(() => PlantModule)],
  providers: [
    WateringResolver,
    WateringRepository,
    WateringScheduleService,
    WateringDueService,
  ],
  exports: [WateringRepository, WateringScheduleService, WateringDueService],
})
export class WateringModule {}
