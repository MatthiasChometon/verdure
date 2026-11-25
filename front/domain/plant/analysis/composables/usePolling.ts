import { getCurrentScope, onScopeDispose } from 'vue';
import { jitteredInterval } from '../../../../infrastructure/api/utils/backoff';

type PollOptions = { intervalMs: number; maxPolls: number };

type UsePolling = {
  // Runs `check` until it returns a value (settled), waiting about `intervalMs` (jittered)
  // between attempts; resolves `undefined` once `maxPolls` attempts found nothing, or once
  // the owning scope is disposed.
  pollUntilSettled: <T>(
    check: () => Promise<T | undefined>,
    options: PollOptions,
  ) => Promise<T | undefined>;
};

// The wait loop shared by the AI jobs (identification, diagnosis). No Nuxt
// auto-import (only explicit `vue` imports), so it is safe to import from a script
// or a plain unit test. Called inside a component or effect scope, it stops
// polling when that scope is disposed (the page was left).
export const usePolling = (): UsePolling => {
  let stopped = false;
  if (getCurrentScope() !== undefined) {
    onScopeDispose((): void => {
      stopped = true;
    });
  }

  const wait = (ms: number): Promise<void> =>
    new Promise((resolve): void => {
      setTimeout(resolve, ms);
    });

  const pollUntilSettled = async <T>(
    check: () => Promise<T | undefined>,
    { intervalMs, maxPolls }: PollOptions,
  ): Promise<T | undefined> => {
    for (let attempt = 0; attempt < maxPolls && !stopped; attempt += 1) {
      // Check first, then wait: a warm worker (and any cloud result) finishes fast,
      // so the result is picked up as soon as it is ready instead of after a delay.
      const settled = await check();
      if (settled !== undefined) {
        return settled;
      }
      // Give or take a fifth: browsers started together drift apart.
      await wait(jitteredInterval(intervalMs));
    }
    return undefined;
  };

  return { pollUntilSettled };
};
