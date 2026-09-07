import { forwardRef, Module } from '@nestjs/common';
import { TaxonomyInfrastructureModule } from '../../infrastructure/taxonomy/module';
import { AiInfrastructureModule } from '../../infrastructure/ai/module';
import { AiWorkerModule } from '../aiWorker/module';
import { AuthModule } from '../auth/module';
import { NicknameModule } from '../nickname/module';
import { SpeciesModule } from '../species/module';
import { SpeciesReferenceModule } from '../speciesReference/module';
import { WateringModule } from '../watering/module';
import { LatestWatering } from './latest-watering';
import { PlantGenus } from './plant-genus';
import { PlantMapper } from './plant-mapper';
import { DetailResolver } from './detail/resolver';
import { ListRepository } from './list/repository';
import { ListResolver } from './list/resolver';
import { PlantSearchService } from './list/search.service';
import { PlantEmbeddingWriter } from './save/embedding-writer';
import { SaveRepository } from './save/repository';
import { SaveResolver } from './save/resolver';

@Module({
  imports: [
    AuthModule,
    AiInfrastructureModule,
    AiWorkerModule,
    TaxonomyInfrastructureModule,
    NicknameModule,
    SpeciesModule,
    forwardRef(() => WateringModule),
    forwardRef(() => SpeciesReferenceModule),
  ],
  providers: [
    LatestWatering,
    PlantGenus,
    PlantMapper,
    DetailResolver,
    ListResolver,
    ListRepository,
    PlantSearchService,
    SaveResolver,
    SaveRepository,
    PlantEmbeddingWriter,
  ],
  // The watering slice reads and writes the plant core through these.
  exports: [LatestWatering, PlantGenus, SaveRepository],
})
export class PlantModule {}
