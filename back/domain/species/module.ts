import { Module } from '@nestjs/common';
import { TaxonomyInfrastructureModule } from '../../infrastructure/taxonomy/module';
import { AuthModule } from '../auth/module';
import { SpeciesRepository } from './repository';
import { SpeciesResolver } from './resolver';
import { SpeciesSeeder } from './seeder';

@Module({
  imports: [TaxonomyInfrastructureModule, AuthModule],
  providers: [SpeciesResolver, SpeciesRepository, SpeciesSeeder],
  exports: [SpeciesRepository],
})
export class SpeciesModule {}
