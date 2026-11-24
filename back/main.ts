import 'dotenv/config';
import { createServer } from 'node:http';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { listenPort, validateEnvironment } from './infrastructure/config/env';
import { configureApp, createAdapter } from './infrastructure/http/setup';

// Phusion Passenger (o2switch shared hosting) sets this global. It ignores the
// port and hands the app its own socket, so under Passenger we route a raw
// http.Server into Fastify instead of letting Nest open its own listener
// (otherwise Passenger never sees a listen() and kills the app after ~90s).
declare const PhusionPassenger: unknown;

const underPassenger = (): boolean => typeof PhusionPassenger !== 'undefined';

const bootstrap = async (): Promise<void> => {
  // The .env file is in process.env: dotenv/config, the first import above, loads it
  // before anything else runs. Validated here rather than through
  // ConfigModule so ConfigService keeps reading the live process.env.
  validateEnvironment(process.env, { deployed: underPassenger() });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    createAdapter(),
    // Nest aborts the process (SIGABRT) on a boot error unless told not to; the
    // catch below is the single path that logs it and exits 1.
    { abortOnError: false },
  );
  await configureApp(app);
  // Without it SIGTERM skips onModuleDestroy: the database pool stays open.
  // Here only, never in configureApp: the e2e suites close their own app.
  app.enableShutdownHooks();

  if (!underPassenger()) {
    await app.listen(listenPort(process.env), '0.0.0.0');
    return;
  }

  // listen() is never reached through Nest here, so the wiring it would have
  // triggered has to be asked for by hand: init() builds the modules, ready()
  // settles the Fastify plugin tree registered by configureApp.
  const fastify = app.getHttpAdapter().getInstance();
  await app.init();
  await fastify.ready();
  createServer((request, response) =>
    fastify.routing(request, response),
  ).listen('passenger');
};

bootstrap().catch((error: unknown) => {
  new Logger('Bootstrap').error(
    'The server failed to start.',
    error instanceof Error ? error.stack : String(error),
  );
  process.exit(1);
});
