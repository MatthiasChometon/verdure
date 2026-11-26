// The pages the maintainer actually uses: the home page of a signed-in account with its plants
// (the "to water today" band, photos included) and one plant's page. Same budgets and same median of
// 9 runs as lighthouserc.cjs. The session is the seeded account load1 (devops/load/seed.sql):
// the job signs its token (devops/load/sign-tokens.mjs) and passes it in LH_SESSION_TOKEN;
// lighthouse-signin.cjs stores it as the session cookie before each audit.
const throttling = require('./lighthouse-throttling.cjs');

const token = process.env.LH_SESSION_TOKEN;
if (!token) {
  throw new Error('LH_SESSION_TOKEN is required');
}
const PLANT = '10000000-0000-4000-8000-000000000001';

module.exports = {
  ci: {
    collect: {
      numberOfRuns: 9,
      puppeteerScript: './lighthouse-signin.cjs',
      puppeteerLaunchOptions: {
        executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome',
        args: ['--no-sandbox'],
      },
      startServerCommand: 'pnpm preview',
      startServerReadyPattern: 'Listening',
      startServerReadyTimeout: 60000,
      url: ['http://localhost:3777/en', `http://localhost:3777/en/plant/${PLANT}`],
      settings: {
        chromeFlags: '--no-sandbox',
        throttling,
      },
    },
    assert: {
      assertions: {
        'largest-contentful-paint': [
          'error',
          { maxNumericValue: 2500, aggregationMethod: 'median' },
        ],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1, aggregationMethod: 'median' }],
        'total-blocking-time': ['error', { maxNumericValue: 200, aggregationMethod: 'median' }],
      },
    },
    upload: { target: 'filesystem', outputDir: 'lighthouse-reports-signedin' },
  },
};
