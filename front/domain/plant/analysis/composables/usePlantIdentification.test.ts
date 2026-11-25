import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { RecognitionStatus } from '#gql/default';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import type { Ref } from 'vue';
import { usePlantIdentification } from './usePlantIdentification';

const { useApiMock, useMutationMock, useImageDownscaleMock } = vi.hoisted(() => ({
  useApiMock: vi.fn(),
  useMutationMock: vi.fn(),
  useImageDownscaleMock: vi.fn(),
}));
mockNuxtImport('useApi', () => useApiMock);
mockNuxtImport('useMutation', () => useMutationMock);
mockNuxtImport('useImageDownscale', () => useImageDownscaleMock);

type Job = { status: RecognitionStatus; species?: string | null; failReason?: string | null };

// Each poll reads the next scripted outcome: a job, or a read error.
const scriptPolls = (outcomes: (Job | Error)[]): void => {
  const data = ref<{ identificationJob: Job } | undefined>();
  const error = ref<Error | undefined>();
  let index = 0;
  useMutationMock.mockReturnValue({
    data,
    error,
    execute: vi.fn(async (): Promise<void> => {
      const outcome = outcomes[Math.min(index, outcomes.length - 1)];
      index += 1;
      error.value = outcome instanceof Error ? outcome : undefined;
      data.value = outcome instanceof Error ? undefined : { identificationJob: outcome as Job };
    }),
  });
};

type Outcome = {
  result: string | undefined;
  failed: Ref<boolean>;
  reason: Ref<string | undefined>;
};

const identifyWith = async (outcomes: (Job | Error)[]): Promise<Outcome> => {
  scriptPolls(outcomes);
  const identification = usePlantIdentification({
    file: ref(new File(['x'], 'plant.jpg')),
    mode: ref('cloud'),
    aiOnline: ref(true),
    checkWorker: vi.fn().mockResolvedValue(undefined),
  });
  const pending = identification.identify();
  await vi.advanceTimersByTimeAsync(5000);
  return {
    result: await pending,
    failed: identification.identifyFailed,
    reason: identification.identifyReason,
  };
};

beforeEach(() => {
  vi.useFakeTimers();
  useApiMock.mockReturnValue({
    data: ref({ jobId: 'job-1' }),
    error: ref(),
    execute: vi.fn(),
  });
  useImageDownscaleMock.mockResolvedValue(new Blob(['x']));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('usePlantIdentification job outcome', () => {
  it('returns the species of a finished job', async () => {
    const { result, failed } = await identifyWith([
      { status: RecognitionStatus.DONE, species: 'Monstera deliciosa' },
    ]);

    expect(result).toBe('Monstera deliciosa');
    expect(failed.value).toBe(false);
  });

  it('fails without a reason when the job is done but found no species', async () => {
    const { result, failed, reason } = await identifyWith([
      { status: RecognitionStatus.DONE, species: null },
    ]);

    expect(result).toBeUndefined();
    expect(failed.value).toBe(true);
    expect(reason.value).toBeUndefined();
  });

  it.each(['quota', 'limit', 'not-configured'])(
    'keeps the actionable failure reason "%s"',
    async (failReason) => {
      const { reason } = await identifyWith([{ status: RecognitionStatus.FAILED, failReason }]);

      expect(reason.value).toBe(failReason);
    },
  );

  it('drops a failure reason it does not know', async () => {
    const { failed, reason } = await identifyWith([
      { status: RecognitionStatus.FAILED, failReason: 'gpu-exploded' },
    ]);

    expect(failed.value).toBe(true);
    expect(reason.value).toBeUndefined();
  });

  it('treats a read error as "not ready yet" and succeeds on the next poll', async () => {
    const { result } = await identifyWith([
      new Error('network blip'),
      { status: RecognitionStatus.DONE, species: 'Ficus lyrata' },
    ]);

    expect(result).toBe('Ficus lyrata');
  });
});
