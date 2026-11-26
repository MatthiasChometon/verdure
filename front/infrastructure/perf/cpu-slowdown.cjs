/* eslint-disable @typescript-eslint/explicit-function-return-type -- plain CommonJS shared by lighthouserc*.cjs and Playwright, no TypeScript return types */
// One CPU slowdown for every performance measurement (Lighthouse `throttling.cpuSlowdownMultiplier`
// and Playwright `Emulation.setCPUThrottlingRate`), calibrated on the machine that runs them so a
// slow laptop and a CI runner emulate the same mid-range phone. Budgets never move.
//
//   slowdown = max(1, 4 * benchmarkIndex / REFERENCE_BENCHMARK_INDEX)
//
// 4 is the PageSpeed Insights reference. benchmarkIndex is Lighthouse's own CPU score
// (`environment.benchmarkIndex` of a report), taken as the median of 3 warm-up runs.
//
// REFERENCE_BENCHMARK_INDEX is the middle of the GitHub runners seen in the CI Lighthouse runs of
// this repository (docs/plans/refactor-socle.md, round 3 "benchmarkIndex 2500-3100" and round 10-11
// "slow runner about 2400, fast about 3500"): (2400 + 3500) / 2 = 2950. On such a runner the
// slowdown is 4; a machine at about 1400 (this developer PC) gets about 1.9.
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const BASE_SLOWDOWN = 4;
const REFERENCE_BENCHMARK_INDEX = 2950;
const WARM_UP_RUNS = 3;
const LIGHTHOUSE = 'lighthouse@12.6.1'; // the version @lhci/cli 0.15.1 embeds
const FIXED_ENV = 'VERDURE_CPU_SLOWDOWN'; // set by a first resolve (children inherit it) or by hand
const INDEX_ENV = 'VERDURE_BENCHMARK_INDEX';

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

const cpuSlowdownFor = (benchmarkIndex) =>
  Math.max(1, Math.round((BASE_SLOWDOWN * benchmarkIndex * 100) / REFERENCE_BENCHMARK_INDEX) / 100);

const chromePath = () =>
  process.env.CHROME_PATH ?? require('@playwright/test').chromium.executablePath();

// One Lighthouse run on a throw-away local page (child process), only to read the benchmarkIndex.
const benchmarkIndexOfOneRun = () => {
  const run = spawnSync(
    process.execPath,
    [path.join(__dirname, 'benchmark-one-run.cjs'), LIGHTHOUSE, chromePath()],
    {
      encoding: 'utf8',
      maxBuffer: 256 * 1024 * 1024,
    },
  );
  return Number(run.stdout.trim());
};

const measureBenchmarkIndex = (runOnce = benchmarkIndexOfOneRun) =>
  median(Array.from({ length: WARM_UP_RUNS }, () => runOnce()));

// { multiplier, benchmarkIndex }; measured once per process tree, then read from the environment.
const resolveCpuSlowdown = ({ measure = measureBenchmarkIndex, env = process.env } = {}) => {
  if (env[FIXED_ENV]) {
    return { multiplier: Number(env[FIXED_ENV]), benchmarkIndex: Number(env[INDEX_ENV] ?? NaN) };
  }
  const benchmarkIndex = Math.round(measure());
  const multiplier = cpuSlowdownFor(benchmarkIndex);
  env[FIXED_ENV] = String(multiplier);
  env[INDEX_ENV] = String(benchmarkIndex);
  console.info(
    `[cpu-slowdown] benchmarkIndex ${benchmarkIndex} (median of ${WARM_UP_RUNS}), reference ${REFERENCE_BENCHMARK_INDEX}, multiplier ${multiplier}`,
  );
  return { multiplier, benchmarkIndex };
};

module.exports = {
  BASE_SLOWDOWN,
  REFERENCE_BENCHMARK_INDEX,
  median,
  cpuSlowdownFor,
  measureBenchmarkIndex,
  resolveCpuSlowdown,
};
