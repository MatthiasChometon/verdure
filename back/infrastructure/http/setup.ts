import fastifyCookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import fastifyMultipart from '@fastify/multipart';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { logResponses } from './request-log.hook';

// Dev front (Nuxt on 3666) and the visual-test preview, used when nothing is
// configured: a deployment MUST set ALLOWED_ORIGINS or FRONT_URL.
const DEV_ORIGINS = ['http://localhost:3666', 'http://localhost:3667'];

// Fastify's own default for a JSON body, written down so the cap is visible.
// Photographs arrive as multipart and are capped separately below.
export const BODY_LIMIT_BYTES = 1024 * 1024;

const UPLOAD_LIMIT_BYTES = 5 * 1024 * 1024;

// An allowlist, never a reflection. `origin: true` echoes whatever origin asks
// and, paired with credentials, lets any site on the internet read a signed-in
// reader's answers: the browser only sends the cookie because we said yes to
// its origin. The list is the one thing that keeps that from happening.
export const allowedOrigins = (config: ConfigService): string[] => {
  const configured = (config.get<string>('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  if (configured.length > 0) return configured;

  const front = config.get<string>('FRONT_URL');
  return front === undefined
    ? DEV_ORIGINS
    : [...new Set([...DEV_ORIGINS, front])];
};

// Everything main.ts does to the app, in one place, so the e2e suites drive the
// very same server: a contract test against a differently wired app proves
// nothing about what ships.
export const configureApp = async (
  app: NestFastifyApplication,
): Promise<void> => {
  app.enableCors({
    origin: allowedOrigins(app.get(ConfigService)),
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
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  logResponses(app.getHttpAdapter().getInstance());
  await app.register(fastifyCookie);
  await app.register(fastifyMultipart, {
    limits: { fileSize: UPLOAD_LIMIT_BYTES },
  });
};

export const createAdapter = (): FastifyAdapter =>
  new FastifyAdapter({ bodyLimit: BODY_LIMIT_BYTES });
