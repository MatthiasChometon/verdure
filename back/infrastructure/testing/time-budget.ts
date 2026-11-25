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
// that primes the pool and the query planner. `prepare` runs before each call,
// outside the timing: it stages what a destructive operation consumes (a plant
// to delete, a pairing to approve) so every sample measures the same work.
export const medianDurationMs = async (
  call: (sample: number) => Promise<unknown>,
  samples: number = SAMPLES,
  prepare: (sample: number) => Promise<unknown> = () => Promise.resolve(),
): Promise<number> => {
  await prepare(-1);
  await call(-1);
  const durations: number[] = [];
  for (let sample = 0; sample < samples; sample += 1) {
    await prepare(sample);
    const startedAt = performance.now();
    await call(sample);
    durations.push(performance.now() - startedAt);
  }
  return median(durations);
};
