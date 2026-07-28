import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { IdentificationService } from './service';

@Module({
  imports: [HttpModule],
  providers: [IdentificationService],
  exports: [IdentificationService],
})
export class IdentificationInfrastructureModule {}
