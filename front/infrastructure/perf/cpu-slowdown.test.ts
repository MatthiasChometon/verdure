import { describe, expect, it, vi } from 'vitest';
import {
  BASE_SLOWDOWN,
  REFERENCE_BENCHMARK_INDEX,
  cpuSlowdownFor,
  measureBenchmarkIndex,
  median,
  resolveCpuSlowdown,
} from './cpu-slowdown.cjs';

describe('cpuSlowdownFor', () => {
  it('is the reference slowdown on a machine at the reference benchmarkIndex', () => {
    expect(cpuSlowdownFor(REFERENCE_BENCHMARK_INDEX)).toBe(BASE_SLOWDOWN);
  });

  it('slows a slow machine less and a fast one more, in proportion', () => {
    expect(cpuSlowdownFor(1400)).toBe(1.9);
    expect(cpuSlowdownFor(REFERENCE_BENCHMARK_INDEX * 2)).toBe(BASE_SLOWDOWN * 2);
  });

  it('never goes under 1', () => {
    expect(cpuSlowdownFor(100)).toBe(1);
  });
});

describe('measureBenchmarkIndex', () => {
  it('is the median of 3 warm-up runs', () => {
    const runs = [1500, 9000, 1400];
    expect(measureBenchmarkIndex(() => runs.shift() ?? 0)).toBe(1500);
    expect(median([3, 1, 2])).toBe(2);
  });
});

describe('resolveCpuSlowdown', () => {
  it('measures once, then every reader of the same environment gets the same value', () => {
    const env: Record<string, string | undefined> = {};
    const measure = vi.fn(() => 1475);
    const first = resolveCpuSlowdown({ measure, env });
    const second = resolveCpuSlowdown({ measure, env });
    expect(first).toEqual({ multiplier: 2, benchmarkIndex: 1475 });
    expect(second).toEqual(first);
    expect(measure).toHaveBeenCalledTimes(1);
  });
});
