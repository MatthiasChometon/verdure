/* eslint-disable @typescript-eslint/explicit-function-return-type -- plain CommonJS shared by lighthouserc*.cjs and Playwright, no TypeScript return types */
// One CPU slowdown for every performance measurement (Lighthouse `throttling.cpuSlowdownMultiplier`
// and Playwright `Emulation.setCPUThrottlingRate`), calibrated on the machine that runs them so a
// slow laptop and a CI runner emulate the same mid-range phone. Budgets never move.
//
//   slowdown = max(1, 4 * benchmarkIndex / REFERENCE_BENCHMARK_INDEX)
//
// CI calibrates too (a GitHub runner's speed varies from 2400 to 4500 between jobs): the same
// helper runs there, nothing is pinned. `VERDURE_CPU_SLOWDOWN` can still force a value by hand.
// benchmarkIndex is Lighthouse's own CPU score (`environment.benchmarkIndex` of a report), taken as
// the median of 3 warm-up runs; if those 3 are more than 15 % apart from their median the
// measurement is not conclusive and is redone once (see `measureBenchmarkIndex`).
//
// REFERENCE_BENCHMARK_INDEX is the median benchmarkIndex of the CI runners, so that on a median
// runner the factor is the plain 4x of PageSpeed (same convention as dibartolomeo, same constant).
// Measured on 24 LH-SUMMARY lines of verdure CI runs 45888582762, 45896494923, 45897999454,
// 45903054152, 46038333611, 46051476530, 46055510630, 46063937624, 46065167875, 46069237805: median
// about 2980, within 10 % of dibartolomeo's 2950, so the shared 2950 is kept. The 1500-2000 range of
// the Lighthouse "CPU Throttling" doc (https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md)
// dates from old Chrome versions; the index has drifted upwards since. A machine at about 1400 (this
// developer PC) gets 1.9, a runner at 2400 gets 3.25, one at 4300 gets 5.8.
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const BASE_SLOWDOWN = 4;
const REFERENCE_BENCHMARK_INDEX = 2950;
const MAX_SPREAD = 0.15; // warm-up runs further than this from their median: not conclusive
const WARM_UP_RUNS = 3;
const LIGHTHOUSE = 'lighthouse@12.6.1'; // the version @lhci/cli 0.15.1 embeds
const FIXED_ENV = 'VERDURE_CPU_SLOWDOWN'; // set by a first resolve (children inherit it) or by hand
const INDEX_ENV = 'VERDURE_BENCHMARK_INDEX';

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

const assertFinitePositive = (value, label) => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`[cpu-slowdown] ${label} must be a finite positive number, got ${value}`);
  }
  return value;
};

const cpuSlowdownFor = (benchmarkIndex) => {
  assertFinitePositive(benchmarkIndex, 'benchmarkIndex (the Lighthouse warm-up failed?)');
  return Math.max(
    1,
    Math.round((BASE_SLOWDOWN * benchmarkIndex * 100) / REFERENCE_BENCHMARK_INDEX) / 100,
  );
};

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

// True when every value is within +-MAX_SPREAD of the median.
const isConclusive = (values) => {
  const middle = median(values);
  return values.every((value) => Math.abs(value - middle) <= MAX_SPREAD * middle);
};

const measureOnce = (runOnce) => {
  const runs = Array.from({ length: WARM_UP_RUNS }, () => runOnce());
  return { runs, value: median(runs), conclusive: isConclusive(runs) };
};

// Median of 3 warm-up runs; when they disagree by more than 15 %, the whole measure is redone once
// and the second one is kept (with a warning if it is still noisy: a loud runner, not a failure).
const measureBenchmarkIndex = (runOnce = benchmarkIndexOfOneRun) => {
  const first = measureOnce(runOnce);
  if (first.conclusive) {
    return first.value;
  }
  console.warn(
    `[cpu-slowdown] warm-up runs ${first.runs.join(', ')} are not conclusive, measuring again`,
  );
  const second = measureOnce(runOnce);
  if (!second.conclusive) {
    console.warn(`[cpu-slowdown] still not conclusive: ${second.runs.join(', ')}`);
  }
  return second.value;
};

// { multiplier, benchmarkIndex }; measured once per process tree, then read from the environment.
const resolveCpuSlowdown = ({ measure = measureBenchmarkIndex, env = process.env } = {}) => {
  if (env[FIXED_ENV]) {
    return {
      multiplier: assertFinitePositive(Number(env[FIXED_ENV]), FIXED_ENV),
      benchmarkIndex: Number(env[INDEX_ENV] ?? NaN),
    };
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
  MAX_SPREAD,
  median,
  isConclusive,
  cpuSlowdownFor,
  measureBenchmarkIndex,
  resolveCpuSlowdown,
};
