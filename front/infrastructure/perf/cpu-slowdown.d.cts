export const BASE_SLOWDOWN: number;
export const REFERENCE_BENCHMARK_INDEX: number;
export const MAX_SPREAD: number;
export const isConclusive: (values: number[]) => boolean;
export const median: (values: number[]) => number;
export const cpuSlowdownFor: (benchmarkIndex: number) => number;
export const measureBenchmarkIndex: (runOnce?: () => number) => number;
export const resolveCpuSlowdown: (options?: {
  measure?: () => number;
  env?: Record<string, string | undefined>;
}) => { multiplier: number; benchmarkIndex: number };
