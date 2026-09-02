import { Module } from '@nestjs/common';
import { TaxonomyInfrastructureModule } from '../../infrastructure/taxonomy/module';
import { AiInfrastructureModule } from '../../infrastructure/ai/module';
import { HttpInfrastructureModule } from '../../infrastructure/http/module';
import { IdentificationInfrastructureModule } from '../../infrastructure/identification/module';
import { AiWorkerModule } from '../aiWorker/module';
import { AuthModule } from '../auth/module';
import { NicknameModule } from '../nickname/module';
import { SpeciesModule } from '../species/module';
import { LatestWatering } from './latest-watering';
import { AdviceResolver } from './advice/resolver';
import { CareDueService } from './care/due.service';
import { CareRepository } from './care/repository';
import { CareResolver } from './care/resolver';
import { DetailResolver } from './detail/resolver';
import { IdentifyController } from './identify/controller';
import { JournalRepository } from './journal/repository';
import { JournalResolver } from './journal/resolver';
import { ListRepository } from './list/repository';
import { ListResolver } from './list/resolver';
import { PlantSearchService } from './list/search.service';
import { PlantEmbeddingWriter } from './save/embedding-writer';
import { SaveRepository } from './save/repository';
import { SaveResolver } from './save/resolver';
import { PlantSafetyService } from './safety/service';
import { SafetyResolver } from './safety/resolver';
import { PlantCareSheetService } from './careSheet/service';
import { CareSheetResolver } from './careSheet/resolver';
import { UploadController } from './uploadImage/controller';
import { WateringDueService } from './watering/due.service';
import { WateringRepository } from './watering/repository';
import { WateringResolver } from './watering/resolver';
import { WateringScheduleService } from './watering/schedule.service';

@Module({
  imports: [
    AuthModule,
    AiInfrastructureModule,
    AiWorkerModule,
    HttpInfrastructureModule,
    IdentificationInfrastructureModule,
    TaxonomyInfrastructureModule,
    NicknameModule,
    SpeciesModule,
  ],
  controllers: [UploadController, IdentifyController],
  providers: [
    LatestWatering,
    AdviceResolver,
    DetailResolver,
    JournalResolver,
    JournalRepository,
    ListResolver,
    ListRepository,
    PlantSearchService,
    SaveResolver,
    SaveRepository,
    PlantEmbeddingWriter,
    SafetyResolver,
    PlantSafetyService,
    CareSheetResolver,
    PlantCareSheetService,
    WateringResolver,
    WateringRepository,
    WateringScheduleService,
    WateringDueService,
    CareResolver,
    CareRepository,
    CareDueService,
  ],
  // The reminder scheduler lives in its own slice; it reads a user's due
  // watering and due care tasks through these.
  exports: [WateringRepository, WateringDueService, CareRepository, CareDueService],
})
export class PlantModule {}
