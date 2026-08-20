import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseInfrastructureModule } from './infrastructure/database/module';
import { GraphqlInfrastructureModule } from './infrastructure/graphql/module';
import { MailInfrastructureModule } from './infrastructure/mail/module';
import { FileStorageInfrastructureModule } from './infrastructure/file-storage/module';
import { AiWorkerModule } from './domain/aiWorker/module';
import { AuthModule } from './domain/auth/module';
import { PlantModule } from './domain/plant/module';
import { SpeciesModule } from './domain/species/module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseInfrastructureModule,
    GraphqlInfrastructureModule,
    FileStorageInfrastructureModule,
    MailInfrastructureModule,
    AuthModule,
    PlantModule,
    SpeciesModule,
    AiWorkerModule,
  ],
})
export class AppModule {}
