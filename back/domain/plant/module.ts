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
import { DetailResolver } from './detail/resolver';
import { IdentifyController } from './identify/controller';
import { ListRepository } from './list/repository';
import { ListResolver } from './list/resolver';
import { PlantSearchService } from './list/search.service';
import { PlantEmbeddingWriter } from './save/embedding-writer';
import { SaveRepository } from './save/repository';
import { SaveResolver } from './save/resolver';
import { UploadController } from './uploadImage/controller';
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
    DetailResolver,
    ListResolver,
    ListRepository,
    PlantSearchService,
    SaveResolver,
    SaveRepository,
    PlantEmbeddingWriter,
    WateringResolver,
    WateringRepository,
    WateringScheduleService,
  ],
})
export class PlantModule {}
