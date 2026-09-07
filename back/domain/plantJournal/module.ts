import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/module';
import { JournalRepository } from './repository';
import { JournalResolver } from './resolver';

@Module({
  imports: [AuthModule],
  providers: [JournalResolver, JournalRepository],
})
export class PlantJournalModule {}
