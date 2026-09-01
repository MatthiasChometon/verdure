import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
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
import { PushSubscriptionModule } from './domain/pushSubscription/module';
import { SpeciesModule } from './domain/species/module';
import { WateringReminderModule } from './domain/wateringReminder/module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Abuse guard for the public API: 20 requests / minute (opt-in per route via
    // ThrottlerGuard — currently the recognition enqueue endpoint).
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
    ScheduleModule.forRoot(),
    DatabaseInfrastructureModule,
    GraphqlInfrastructureModule,
    FileStorageInfrastructureModule,
    MailInfrastructureModule,
    AuthModule,
    PlantModule,
    PushSubscriptionModule,
    WateringReminderModule,
    SpeciesModule,
    BugReportModule,
    ImprovementRequestModule,
    AiWorkerModule,
  ],
})
export class AppModule {}
