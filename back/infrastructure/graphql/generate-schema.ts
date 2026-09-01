import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from '../../app.module';

// Regenerates the committed GraphQL schema (infrastructure/graphql/schema.gql)
// from the TS decorators, offline. Building the module graph makes the Apollo
// code-first driver write the schema during init; no DB query runs (postgres.js
// connects lazily, and the seeders + reminder scheduler are gated off below), so
// this is safe with no database up. Run with `pnpm schema:generate`.
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
