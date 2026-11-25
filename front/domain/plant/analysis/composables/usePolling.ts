type PollOptions = { intervalMs: number; maxPolls: number };

type UsePolling = {
  // Runs `check` until it returns a value (settled), waiting `intervalMs` between
  // attempts; resolves `undefined` once `maxPolls` attempts found nothing.
  pollUntilSettled: <T>(
    check: () => Promise<T | undefined>,
    options: PollOptions,
  ) => Promise<T | undefined>;
};

// The wait loop shared by the AI jobs (identification, diagnosis). Pure: no Nuxt
// auto-import, so it is safe to import from a script or a plain unit test.
export const usePolling = (): UsePolling => {
  const wait = (ms: number): Promise<void> =>
    new Promise((resolve): void => {
      setTimeout(resolve, ms);
    });

  const pollUntilSettled = async <T>(
    check: () => Promise<T | undefined>,
    { intervalMs, maxPolls }: PollOptions,
  ): Promise<T | undefined> => {
    for (let attempt = 0; attempt < maxPolls; attempt += 1) {
      // Check first, then wait: a warm worker (and any cloud result) finishes fast,
      // so the result is picked up as soon as it is ready instead of after a delay.
      const settled = await check();
      if (settled !== undefined) {
        return settled;
      }
      await wait(intervalMs);
    }
    return undefined;
  };

  return { pollUntilSettled };
};
