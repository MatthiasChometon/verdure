import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AiService } from './service';

// The embedder may cold-start a model, hence the generous budget; past it the
// call is hung, and the request (or the background sweep) must not wait forever.
const AI_TIMEOUT_MS = 60_000;

@Module({
  imports: [HttpModule.register({ timeout: AI_TIMEOUT_MS })],
  providers: [AiService],
  exports: [AiService],
})
export class AiInfrastructureModule {}
