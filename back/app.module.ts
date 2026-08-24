import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseInfrastructureModule } from './infrastructure/database/module';
import { GraphqlInfrastructureModule } from './infrastructure/graphql/module';
import { MailInfrastructureModule } from './infrastructure/mail/module';
import { FileStorageInfrastructureModule } from './infrastructure/file-storage/module';
import { AiWorkerModule } from './domain/aiWorker/module';
import { AuthModule } from './domain/auth/module';
import { BugReportModule } from './domain/bugReport/module';
import { ImprovementRequestModule } from './domain/improvementRequest/module';
import { PlantModule } from './domain/plant/module';
import { SpeciesModule } from './domain/species/module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Abuse guard for the public API: 20 requests / minute (opt-in per route via
    // ThrottlerGuard — currently the recognition enqueue endpoint).
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
    DatabaseInfrastructureModule,
    GraphqlInfrastructureModule,
    FileStorageInfrastructureModule,
    MailInfrastructureModule,
    AuthModule,
    PlantModule,
    SpeciesModule,
    BugReportModule,
    ImprovementRequestModule,
    AiWorkerModule,
  ],
})
export class AppModule {}
