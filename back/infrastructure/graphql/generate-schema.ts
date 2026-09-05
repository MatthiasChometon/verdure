import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from '../../app.module';

// Regenerates schema.gql offline: booting the module graph makes Apollo write it
// during init, with no DB needed (seeders/scheduler gated off below).
process.env.SEED_ON_STARTUP = 'false';
process.env.REMINDER_ENABLED = 'false';

const generate = async (): Promise<void> => {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { logger: ['error', 'warn'] },
  );
  await app.init();
  await app.close();
  // Apollo/Fastify keep handles open; the file is written by now, so exit.
  process.exit(0);
};

void generate().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
