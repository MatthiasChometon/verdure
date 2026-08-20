import { Module } from '@nestjs/common';
import { HttpInfrastructureModule } from '../../infrastructure/http/module';
import { AuthModule } from '../auth/module';
import { SpeciesModule } from '../species/module';
import { RecognitionRequestController } from './job/request.controller';
import { RecognitionJobRepository } from './job/repository';
import { RecognitionJobResolver } from './job/resolver';
import { WorkerChannelController } from './job/worker.controller';
import { WorkerGuard } from './token/guard';
import { WorkerTokenRepository } from './token/repository';
import { WorkerTokenResolver } from './token/resolver';
import { WorkerTokenService } from './token/token.service';

// Async plant recognition via the user's own local AI worker: a job queue the
// phone enqueues to, a token-authenticated channel the worker long-polls, and
// the "is a worker online?" signal. FileStorageService is global.
@Module({
  imports: [AuthModule, HttpInfrastructureModule, SpeciesModule],
  controllers: [RecognitionRequestController, WorkerChannelController],
  providers: [
    WorkerTokenService,
    WorkerTokenRepository,
    WorkerTokenResolver,
    WorkerGuard,
    RecognitionJobRepository,
    RecognitionJobResolver,
  ],
})
export class AiWorkerModule {}
