import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgres://verdure:verdure@localhost:5432/verdure_test';

process.env.DATABASE_URL = TEST_DATABASE_URL;
// Avoid contacting Ethereal on app bootstrap: e2e stubs MailService anyway.
process.env.MAIL_HOST = 'localhost';
// Never trigger the GBIF species sweep from tests.
process.env.SEED_ON_STARTUP = 'false';
// Never schedule the daily watering-reminder cron from tests.
process.env.REMINDER_ENABLED = 'false';
// Keep the worker long-poll short so the queue e2e doesn't wait on it.
process.env.AI_WORKER_LONG_POLL_MS = '400';
process.env.AI_WORKER_POLL_INTERVAL_MS = '50';

export default defineConfig({
  oxc: false,
  test: {
    globals: true,
    environment: 'node',
    root: './',
    // e2e files share one test database (and each migrates it on boot), so
    // they must run one at a time to avoid racing on the schema.
    fileParallelism: false,
    include: ['**/*e2e.test.ts'],
    exclude: ['node_modules/**', 'dist/**'],
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      MAIL_HOST: 'localhost',
      SEED_ON_STARTUP: 'false',
      REMINDER_ENABLED: 'false',
    },
    globalSetup: ['./infrastructure/testing/e2e-database.ts'],
  },
  plugins: [
    swc.vite({
      jsc: {
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
        },
      },
    }),
  ],
});
