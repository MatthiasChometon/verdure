// The CPU slowdown of Lighthouse comes from the one helper that Playwright uses too: 4 at the
// reference benchmarkIndex (1750, the middle of the high-end desktop bracket of the Lighthouse
// "CPU Throttling" doc), scaled to this machine's or runner's own (see cpu-slowdown.cjs).
// Budgets are unchanged. The multiplier and the benchmarkIndex are in every report
// (`configSettings.throttling.cpuSlowdownMultiplier`, `environment.benchmarkIndex`).
const { resolveCpuSlowdown } = require('./infrastructure/perf/cpu-slowdown.cjs');

module.exports = { cpuSlowdownMultiplier: resolveCpuSlowdown().multiplier };
