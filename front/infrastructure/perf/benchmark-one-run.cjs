/* eslint-disable @typescript-eslint/explicit-function-return-type -- plain CommonJS child process, no TypeScript return types */
// One Lighthouse run on a throw-away local page, printing its `environment.benchmarkIndex`.
// Lighthouse refuses about:blank, and no app server is up yet when a lhci config is loaded.
const http = require('node:http');
const { spawn } = require('node:child_process');

const server = http.createServer((_request, response) => {
  response.setHeader('content-type', 'text/html');
  response.end('<!doctype html><title>benchmark</title><p>benchmark</p>');
});

server.listen(0, '127.0.0.1', () => {
  const { port } = server.address();
  const lighthouse = spawn(
    'pnpm',
    [
      'dlx',
      process.argv[2],
      `http://127.0.0.1:${port}/`,
      '--only-categories=performance',
      '--output=json',
      '--output-path=stdout',
      '--quiet',
      '--chrome-flags="--headless=new --no-sandbox"',
    ],
    { shell: true, env: { ...process.env, CHROME_PATH: process.argv[3] } },
  );
  let out = '';
  lighthouse.stdout.on('data', (chunk) => {
    out += chunk;
  });
  lighthouse.on('close', () => {
    server.close();
    console.log(JSON.parse(out).environment.benchmarkIndex);
  });
});
