const throttling = require('./lighthouse-throttling.cjs');

module.exports = {
  ci: {
    collect: {
      numberOfRuns: 9,
      startServerCommand: 'pnpm preview',
      startServerReadyPattern: 'Listening',
      startServerReadyTimeout: 60000,
      url: ['http://localhost:3777/', 'http://localhost:3777/conditions'],
      settings: { chromeFlags: '--no-sandbox', throttling },
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
    upload: { target: 'filesystem', outputDir: 'lighthouse-reports' },
  },
};
