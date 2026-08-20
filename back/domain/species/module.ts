import { Module } from '@nestjs/common';
import { TaxonomyInfrastructureModule } from '../../infrastructure/taxonomy/module';
import { AuthModule } from '../auth/module';
import { SpeciesReconciler } from './reconciler';
import { SpeciesRepository } from './repository';
import { SpeciesResolver } from './resolver';
import { SpeciesSeeder } from './seeder';

@Module({
  imports: [TaxonomyInfrastructureModule, AuthModule],
  providers: [
    SpeciesResolver,
    SpeciesRepository,
    SpeciesReconciler,
    SpeciesSeeder,
  ],
  exports: [SpeciesRepository, SpeciesReconciler],
})
export class SpeciesModule {}
