import {
  Injectable,
  Logger,
  Module,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Command, CommandFactory, CommandRunner } from 'nest-commander';
import { DatabaseInfrastructureModule } from '../../infrastructure/database/module';
import { NicknameFactory } from './factory';
import { NicknameRepository } from './repository';

// Fills the funny-nickname bank on first boot of a fresh database, so a new
// machine self-populates alongside the species index. The bank is generated
// from the curated source vocabulary (no network, no LLM), so this is fast. On
// boot it only runs when the bank is empty; the seed command calls seed()
// directly. Disabled by SEED_ON_STARTUP=false (tests).
@Injectable()
export class NicknameSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(NicknameSeeder.name);

  constructor(
    private readonly repository: NicknameRepository,
    private readonly config: ConfigService,
    private readonly factory: NicknameFactory,
  ) {}

  onApplicationBootstrap(): void {
    if (this.config.get<string>('SEED_ON_STARTUP') === 'false') {
      return;
    }
    void this.seedIfEmpty();
  }

  // Rebuilds the whole bank from the source vocabulary in the database.
  async seed(): Promise<void> {
    const vocabulary = await this.repository.loadVocabulary();
    const rows = this.factory.build(vocabulary);
    await this.repository.replaceAll(rows);
    this.logger.log(
      `Refilled the nickname bank with ${rows.length.toLocaleString('en-US')} nicknames.`,
    );
  }

  private async seedIfEmpty(): Promise<void> {
    try {
      if ((await this.repository.count()) > 0) {
        return;
      }
      await this.seed();
    } catch (error) {
      this.logger.error(`Nickname seeding failed: ${String(error)}`);
    }
  }
}

// `pnpm db:seed-nicknames` — run this file directly to rebuild the bank. The CLI
// wiring is guarded so importing the seeder for the app never boots it.
if (require.main === module) {
  process.env.SEED_ON_STARTUP = 'false';

  @Command({
    name: 'seed-nicknames',
    description: 'Refill the funny plant-nickname bank.',
    options: { isDefault: true },
  })
  class SeedNicknamesCommand extends CommandRunner {
    constructor(private readonly seeder: NicknameSeeder) {
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
    ],
    providers: [
      NicknameRepository,
      NicknameFactory,
      NicknameSeeder,
      SeedNicknamesCommand,
    ],
  })
  class SeedNicknamesModule {}

  void CommandFactory.run(SeedNicknamesModule, ['log', 'warn', 'error']).catch(
    (error: unknown) => {
      console.error(error);
      process.exit(1);
    },
  );
}
