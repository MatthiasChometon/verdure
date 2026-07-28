import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AiService } from './service';

@Module({
  imports: [HttpModule],
  providers: [AiService],
  exports: [AiService],
})
export class AiInfrastructureModule {}
