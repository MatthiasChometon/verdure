// The CPU slowdown of Lighthouse comes from the one helper that Playwright uses too: 4 at the
// reference benchmarkIndex (2950, the median of the CI runners, see cpu-slowdown.cjs), scaled to this
// machine's or runner's own.
// Budgets are unchanged. The multiplier and the benchmarkIndex are in every report
// (`configSettings.throttling.cpuSlowdownMultiplier`, `environment.benchmarkIndex`).
const { resolveCpuSlowdown } = require('./infrastructure/perf/cpu-slowdown.cjs');

module.exports = { cpuSlowdownMultiplier: resolveCpuSlowdown().multiplier };
