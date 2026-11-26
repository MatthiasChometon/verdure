// The CPU slowdown of Lighthouse comes from the one helper that Playwright uses too: 4 at the
// reference benchmarkIndex of a CI runner, scaled to this machine's own (see cpu-slowdown.cjs).
// Budgets are unchanged. The multiplier and the benchmarkIndex are in every report
// (`configSettings.throttling.cpuSlowdownMultiplier`, `environment.benchmarkIndex`).
const { resolveCpuSlowdown } = require('./infrastructure/perf/cpu-slowdown.cjs');

module.exports = { cpuSlowdownMultiplier: resolveCpuSlowdown().multiplier };
