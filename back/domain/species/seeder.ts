import {
  Injectable,
  Logger,
  Module,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Command, CommandFactory, CommandRunner } from 'nest-commander';
import { DatabaseInfrastructureModule } from '../../infrastructure/database/module';
import { TaxonomyInfrastructureModule } from '../../infrastructure/taxonomy/module';
import { TaxonomyService } from '../../infrastructure/taxonomy/service';
import { SpeciesRepository } from './repository';

// Fills the local species index from GBIF on first boot of a fresh database, so
// a new machine self-populates. Runs in the background (does not block startup)
// and only when the index is empty. Disabled by SEED_ON_STARTUP=false (tests).
@Injectable()
export class SpeciesSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(SpeciesSeeder.name);

  constructor(
    private readonly repository: SpeciesRepository,
    private readonly gbif: TaxonomyService,
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    if (this.config.get<string>('SEED_ON_STARTUP') === 'false') {
      return;
    }
    // Fire-and-forget: startup must not wait on a multi-minute GBIF sweep.
    void this.seedIfEmpty();
  }

  private async seedIfEmpty(): Promise<void> {
    try {
      if ((await this.repository.count()) > 0) {
        return;
      }
      await this.seed();
    } catch (error) {
      this.logger.error(`Species seeding failed: ${String(error)}`);
    }
  }

  // Full GBIF sweep (idempotent upsert). Public so the CLI command can force it.
  async seed(): Promise<void> {
    this.logger.log('Seeding the species index from GBIF…');
    let total = 0;
    await this.gbif.sweepPlantSpecies(async (matches) => {
      await this.repository.cache(matches);
      total += matches.length;
      if (total % 50_000 < matches.length) {
        this.logger.log(
          `Seeding species… ${total.toLocaleString('en-US')} so far.`,
        );
      }
    });
    this.logger.log(
      `Species seeding done: ${total.toLocaleString('en-US')} species.`,
    );
  }
}

// `pnpm db:seed-species` — run this file directly to force a full re-seed. The
// CLI wiring is guarded so importing the seeder for the app never boots it.
if (require.main === module) {
  process.env.SEED_ON_STARTUP = 'false';

  @Command({
    name: 'seed-species',
    description: 'Seed the species index from GBIF.',
    options: { isDefault: true },
  })
  class SeedSpeciesCommand extends CommandRunner {
    constructor(private readonly seeder: SpeciesSeeder) {
      super();
    }

    override run(): Promise<void> {
      return this.seeder.seed();
    }
  }

  @Module({
    imports: [
      ConfigModule.forRoot({ isGlobal: true }),
      DatabaseInfrastructureModule,
      TaxonomyInfrastructureModule,
    ],
    providers: [SpeciesRepository, SpeciesSeeder, SeedSpeciesCommand],
  })
  class SeedSpeciesModule {}

  void CommandFactory.run(SeedSpeciesModule, ['log', 'warn', 'error']).catch(
    (error: unknown) => {
      console.error(error);
      process.exit(1);
    },
  );
}
