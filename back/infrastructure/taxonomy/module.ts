import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TaxonomyService } from './service';

// GBIF is a public API with no SLA; a hung call must not stall the request.
const TAXONOMY_TIMEOUT_MS = 30_000;

@Module({
  imports: [HttpModule.register({ timeout: TAXONOMY_TIMEOUT_MS })],
  providers: [TaxonomyService],
  exports: [TaxonomyService],
})
export class TaxonomyInfrastructureModule {}
