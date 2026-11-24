import { existsSync, readFileSync } from 'node:fs';
import { defineVitestConfig } from '@nuxt/test-utils/config';

// Unlike `nuxt prepare`, Vitest does not auto-load `.env`, so the
// nuxt-graphql-client codegen would fall back to its default host. Read
// GQL_HOST straight from `.env` before the Nuxt config (and its codegen)
// runs; an explicit environment override still wins.
const readEnv = (key: string): string | undefined => {
  if (!existsSync('.env')) {
    return undefined;
  }
  const prefix = `${key}=`;
  return readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .find((line) => line.startsWith(prefix))
    ?.slice(prefix.length)
    .trim();
};

process.env.GQL_HOST ??= readEnv('GQL_HOST');

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    include: ['domain/**/*.test.ts', 'infrastructure/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/*e2e.test.ts', '**/*.visual.test.ts'],
    hookTimeout: 60_000,
    // The first component mount of every test file costs 4.5-6 s on a cold Nuxt environment
    // (measured: Timeline.test.ts 6.0 s, Form.test.ts 4.9 s, SafetyBadge.test.ts 4.9 s; about 25
    // files do it), so the 5 s default is borderline. 15 s keeps a hung test failing quickly.
    testTimeout: 15_000,
  },
});
