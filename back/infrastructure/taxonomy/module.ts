import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TaxonomyService } from './service';

@Module({
  imports: [HttpModule],
  providers: [TaxonomyService],
  exports: [TaxonomyService],
})
export class TaxonomyInfrastructureModule {}
