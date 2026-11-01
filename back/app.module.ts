import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseInfrastructureModule } from './infrastructure/database/module';
import { GraphqlInfrastructureModule } from './infrastructure/graphql/module';
import { HealthInfrastructureModule } from './infrastructure/health/module';
import { clientIp } from './infrastructure/http/client-ip';
import type { ClientRequest } from './infrastructure/http/type';
import { MailInfrastructureModule } from './infrastructure/mail/module';
import { FileStorageInfrastructureModule } from './infrastructure/file-storage/module';
import { AiWorkerModule } from './domain/aiWorker/module';
import { AuthModule } from './domain/auth/module';
import { BugReportModule } from './domain/bugReport/module';
import { CalendarFeedModule } from './domain/calendarFeed/module';
import { ImprovementRequestModule } from './domain/improvementRequest/module';
import { PlantModule } from './domain/plant/module';
import { PlantCareModule } from './domain/plantCare/module';
import { PlantIdentifyModule } from './domain/plantIdentify/module';
import { PlantJournalModule } from './domain/plantJournal/module';
import { PushSubscriptionModule } from './domain/pushSubscription/module';
import { SpeciesModule } from './domain/species/module';
import { SpeciesReferenceModule } from './domain/speciesReference/module';
import { WateringModule } from './domain/watering/module';
import { WateringReminderModule } from './domain/wateringReminder/module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Abuse guard for the public API: 20 requests / minute per client, opt-in
    // per route via ThrottlerGuard (uploads, worker pairing, auth — tighter).
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 20 }],
      // The throttler types the request loosely; under Fastify it is a FastifyRequest.
      getTracker: (request: Record<string, unknown>): string =>
        clientIp(request as ClientRequest),
    }),
    ScheduleModule.forRoot(),
    DatabaseInfrastructureModule,
    GraphqlInfrastructureModule,
    HealthInfrastructureModule,
    FileStorageInfrastructureModule,
    MailInfrastructureModule,
    AuthModule,
    CalendarFeedModule,
    PlantModule,
    PlantCareModule,
    PlantIdentifyModule,
    PlantJournalModule,
    PushSubscriptionModule,
    WateringReminderModule,
    SpeciesModule,
    SpeciesReferenceModule,
    WateringModule,
    BugReportModule,
    ImprovementRequestModule,
    AiWorkerModule,
  ],
})
export class AppModule {}
