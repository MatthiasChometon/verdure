// UX-derived time budgets (docs/plans/refactor-socle.md, "Performance lot").
// They come from what a person accepts, never from what the code does today:
// slower code is a bug to fix, not a budget to raise.
export const BUDGET_MS = {
  // Flow of thought kept (Nielsen 1 s): the reads feeding a screen answer fast
  // enough for its main content to show within 1 s after a navigation.
  read: 300,
  // Doherty threshold (400 ms) split between network, API and rendering.
  mutation: 250,
} as const;

// Calls per measurement: a single sample is never asserted (anti-flake).
export const SAMPLES = 11;

export const median = (values: number[]): number => {
  const sorted = [...values].sort((first, second) => first - second);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

// Median duration (ms) of `samples` sequential calls, after one warm-up call
// that primes the pool and the query planner.
export const medianDurationMs = async (
  call: () => Promise<unknown>,
  samples: number = SAMPLES,
): Promise<number> => {
  await call();
  const durations: number[] = [];
  for (let index = 0; index < samples; index += 1) {
    const startedAt = performance.now();
    await call();
    durations.push(performance.now() - startedAt);
  }
  return median(durations);
};
