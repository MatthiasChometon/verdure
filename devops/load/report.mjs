// Markdown report of a run, for the job summary: `node report.mjs <reports-dir> >> $GITHUB_STEP_SUMMARY`.
// Reads the `summary-<profile>.json` files k6 exported. Per operation: the measured p95/p99
// against the budget and the UX rule behind each number. For the breakpoint: the limit as
// a number (visits and requests per second the replica held before the abort).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] ?? '.';
const read = (profile) => {
  const file = join(dir, `summary-${profile}.json`);
  return existsSync(file)
    ? JSON.parse(readFileSync(file, 'utf8')).metrics
    : undefined;
};

// budgets.ts is TypeScript: strip the types to read its table (no build step in the job).
const { BUDGETS } = await import('./budgets.ts');
const REQUESTS_PER_VISIT = 11;

const table = (profile, metrics) => {
  const rows = Object.entries(BUDGETS).map(([op, budget]) => {
    const m = metrics[`http_req_duration{op:${op}}`];
    const p95 = m?.['p(95)'];
    const p99 = m?.['p(99)'];
    const mark = (value, limit) =>
      value === undefined
        ? 'no sample'
        : `${value.toFixed(0)} ms ${value < limit ? 'ok' : 'OVER'}`;
    return `| ${op} | ${mark(p95, budget.p95)} / ${budget.p95} | ${budget.p95Rule} | ${mark(p99, budget.p99)} / ${budget.p99} | ${budget.p99Rule} |`;
  });
  return [
    `#### ${profile}: p95 and p99 per operation (measured / budget)`,
    '',
    '| operation | p95 | rule | p99 | rule |',
    '|---|---|---|---|---|',
    ...rows,
  ].join('\n');
};

// Ramp 10 -> 500 visits/s over 10 minutes (profiles.ts): iterations(t) = 10 t + 490 t^2 / 1200,
// solved for the time the run held before the abort, then the rate at that time.
const breakpoint = (metrics) => {
  const iterations = metrics.iterations?.count;
  if (iterations === undefined) return 'Breakpoint: no data.';
  const a = 490 / 1200;
  const t = (-10 + Math.sqrt(100 + 4 * a * iterations)) / (2 * a);
  const rate = Math.min(500, 10 + (490 * t) / 600);
  return `Breakpoint: the replica (one core, 512 MB) held about ${rate.toFixed(0)} visits/s (${(rate * REQUESTS_PER_VISIT).toFixed(0)} requests/s, ${(rate * 5).toFixed(0)} people at once) before p95 of \`plants\` passed 1 s or 5 % of requests failed; the expected peak is 2 visits/s, so the margin is x${(rate / 2).toFixed(0)}.`;
};

for (const profile of ['load', 'spike', 'stress']) {
  const metrics = read(profile);
  if (metrics) console.log(`${table(profile, metrics)}\n`);
}
const stress = read('stress');
if (stress)
  console.log(
    `Stress: ${(stress.http_req_failed?.value * 100 || 0).toFixed(2)} % failed, p95 of \`plants\` ${(stress['http_req_duration{op:plants}']?.['p(95)'] ?? 0).toFixed(0)} ms at the end of 8 minutes up to 80 visits/s (400 people).\n`,
  );
const stop = read('breakpoint');
if (stop) console.log(breakpoint(stop));
