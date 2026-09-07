import { Module } from '@nestjs/common';
import { HttpInfrastructureModule } from '../../infrastructure/http/module';
import { IdentificationInfrastructureModule } from '../../infrastructure/identification/module';
import { AuthModule } from '../auth/module';
import { SpeciesModule } from '../species/module';
import { IdentifyController } from './identify/controller';
import { UploadController } from './uploadImage/controller';

@Module({
  imports: [
    AuthModule,
    HttpInfrastructureModule,
    IdentificationInfrastructureModule,
    SpeciesModule,
  ],
  controllers: [IdentifyController, UploadController],
})
export class PlantIdentifyModule {}
