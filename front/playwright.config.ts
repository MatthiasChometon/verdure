import { defineConfig } from '@playwright/test';
import { resolveCpuSlowdown } from './infrastructure/perf/cpu-slowdown.cjs';

// Measured once here, in the main process: the workers inherit it through the environment, so the
// perf tests and Lighthouse slow the CPU by the same calibrated multiplier.
if (process.argv.some((arg) => arg.includes('perf'))) {
  resolveCpuSlowdown();
}

const VISUAL_PORT = 3777;
const baseURL = `http://localhost:${VISUAL_PORT}`;

export default defineConfig({
  testDir: './',
  testMatch: '**/*.{visual,perf}.test.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: 'list',
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' },
  },
  use: {
    baseURL,
  },
  webServer: {
    command: 'pnpm preview',
    url: baseURL,
    env: { PORT: String(VISUAL_PORT) },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } } },
    { name: 'tablet', use: { viewport: { width: 768, height: 1024 } } },
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } },
  ],
});
