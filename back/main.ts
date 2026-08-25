import { createServer } from 'node:http';
import fastifyCookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import fastifyMultipart from '@fastify/multipart';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

// Dev front (Nuxt on 3666) and the visual-test preview, used when nothing is
// configured — a deployment MUST set ALLOWED_ORIGINS or FRONT_URL.
const DEV_ORIGINS = ['http://localhost:3666', 'http://localhost:3667'];

// An allowlist, never a reflection. `origin: true` echoes whatever origin asks
// and, paired with credentials, lets any site on the internet read a signed-in
// reader's answers — the browser only sends the cookie because we said yes to
// its origin. The list is the one thing that keeps that from happening.
const allowedOrigins = (config: ConfigService): string[] => {
  const configured = (config.get<string>('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  if (configured.length > 0) return configured;

  const front = config.get<string>('FRONT_URL');
  return front === undefined ? DEV_ORIGINS : [...new Set([...DEV_ORIGINS, front])];
};

const bootstrap = async (): Promise<void> => {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  const config = app.get(ConfigService);

  app.enableCors({
    origin: allowedOrigins(config),
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
  });

  // This host serves JSON and images, never a page it wants framed: the
  // strictest content policy is also the correct one, and it costs nothing.
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
      },
    },
    // cross-origin, not same-site: this same server also serves the plant images
    // under /images, and the front embeds them from another origin (Netlify).
    // same-site would have the browser refuse every one of them.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'no-referrer' },
    // Only meaningful over HTTPS, which the platform terminates for us.
    hsts: { maxAge: 15_552_000, includeSubDomains: true },
  });

  // whitelist drops undeclared fields; forbidNonWhitelisted rejects the request
  // outright, so a crafted body cannot quietly reach a column it never declared.
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
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
