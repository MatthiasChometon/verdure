import { Module } from '@nestjs/common';
import { AiInfrastructureModule } from '../../infrastructure/ai/module';
import { HttpInfrastructureModule } from '../../infrastructure/http/module';
import { PlantNetService } from '../../infrastructure/plant-recognition/plantnet.service';
import { AuthModule } from '../auth/module';
import { SpeciesModule } from '../species/module';
import { UserModule } from '../user/module';
import { SemanticEmbeddingService } from './embedding/service';
import { RecognitionRequestController } from './job/request.controller';
import { RecognitionJobRepository } from './job/repository';
import { RecognitionJobResolver } from './job/resolver';
import { WorkerChannelController } from './job/worker.controller';
import { WorkerPairingController } from './pairing/pair.controller';
import { WorkerPairingRepository } from './pairing/repository';
import { WorkerPairingResolver } from './pairing/resolver';
import { WorkerPairingService } from './pairing/pairing.service';
import { WorkerGuard } from './token/guard';
import { WorkerTokenRepository } from './token/repository';
import { WorkerTokenResolver } from './token/resolver';
import { WorkerTokenService } from './token/token.service';

// Async plant recognition via the user's own local AI worker: a job queue the
// phone enqueues to, a token-authenticated channel the worker long-polls, and
// the "is a worker online?" signal. FileStorageService is global.
@Module({
  imports: [
    AuthModule,
    HttpInfrastructureModule,
    SpeciesModule,
    AiInfrastructureModule,
    UserModule,
  ],
  controllers: [
    RecognitionRequestController,
    WorkerChannelController,
    WorkerPairingController,
  ],
  providers: [
    PlantNetService,
    WorkerTokenService,
    WorkerTokenRepository,
    WorkerTokenResolver,
    WorkerGuard,
    RecognitionJobRepository,
    RecognitionJobResolver,
    SemanticEmbeddingService,
    WorkerPairingService,
    WorkerPairingRepository,
    WorkerPairingResolver,
  ],
  exports: [SemanticEmbeddingService],
})
export class AiWorkerModule {}
