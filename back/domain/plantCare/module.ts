import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/module';
import { CareDueService } from './due.service';
import { CareRepository } from './repository';
import { CareResolver } from './resolver';

@Module({
  imports: [AuthModule],
  providers: [CareResolver, CareRepository, CareDueService],
  // The reminder scheduler reads a user's due care tasks through these.
  exports: [CareRepository, CareDueService],
})
export class PlantCareModule {}
