import { createServer } from 'node:http';
import fastifyCookie from '@fastify/cookie';
import fastifyMultipart from '@fastify/multipart';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

// Phusion Passenger (o2switch shared hosting) sets this global. It ignores the
// port and hands the app its own socket, so under Passenger we route a raw
// http.Server into Fastify instead of letting Nest open its own listener
// (otherwise Passenger never sees a listen() and kills the app after ~90s).
declare const PhusionPassenger: unknown;
const underPassenger = typeof PhusionPassenger !== 'undefined';

const bootstrap = async (): Promise<void> => {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.register(fastifyCookie);
  await app.register(fastifyMultipart, {
    limits: { fileSize: 5 * 1024 * 1024 },
  });

  if (underPassenger) {
    const fastify = app.getHttpAdapter().getInstance();
    await app.init();
    await fastify.ready();
    createServer((request, response) =>
      fastify.routing(request, response),
    ).listen('passenger');
    return;
  }

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
};
void bootstrap();
