import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { RecognitionStatus } from '#gql/default';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { usePlantDiagnosis } from './usePlantDiagnosis';

const { useMutationMock } = vi.hoisted(() => ({ useMutationMock: vi.fn() }));
mockNuxtImport('useMutation', () => useMutationMock);

type Job = { status: RecognitionStatus; diagnosis?: string | null };

// First useMutation call = enqueue, second = poll (declaration order in the composable).
const scriptJob = (outcomes: (Job | Error)[]): void => {
  const pollData = ref<{ diagnosisJob: Job } | undefined>();
  const pollError = ref<Error | undefined>();
  let index = 0;
  useMutationMock
    .mockReturnValueOnce({
      data: ref({ diagnosePlant: { id: 'job-1' } }),
      error: ref(),
      execute: vi.fn(),
    })
    .mockReturnValueOnce({
      data: pollData,
      error: pollError,
      execute: vi.fn(async (): Promise<void> => {
        const outcome = outcomes[Math.min(index, outcomes.length - 1)];
        index += 1;
        pollError.value = outcome instanceof Error ? outcome : undefined;
        pollData.value = outcome instanceof Error ? undefined : { diagnosisJob: outcome as Job };
      }),
    });
};

const diagnoseWith = async (
  outcomes: (Job | Error)[],
): Promise<{ diagnosis: string | undefined; failed: boolean }> => {
  scriptJob(outcomes);
  const state = usePlantDiagnosis({
    plantId: ref('plant-1'),
    aiOnline: ref(true),
    checkWorker: vi.fn().mockResolvedValue(undefined),
  });
  const pending = state.diagnose();
  await vi.advanceTimersByTimeAsync(5000);
  await pending;
  return { diagnosis: state.diagnosis.value, failed: state.failed.value };
};

beforeEach(() => {
  vi.useFakeTimers();
  useMutationMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('usePlantDiagnosis job outcome', () => {
  it('exposes the text of a finished job', async () => {
    const outcome = await diagnoseWith([
      { status: RecognitionStatus.DONE, diagnosis: 'Trop d’eau.' },
    ]);

    expect(outcome).toEqual({ diagnosis: 'Trop d’eau.', failed: false });
  });

  it('fails when the job is done but returned no text', async () => {
    const outcome = await diagnoseWith([{ status: RecognitionStatus.DONE, diagnosis: null }]);

    expect(outcome).toEqual({ diagnosis: undefined, failed: true });
  });

  it('fails when the job itself failed', async () => {
    const outcome = await diagnoseWith([{ status: RecognitionStatus.FAILED }]);

    expect(outcome.failed).toBe(true);
  });

  it('treats a read error as "not ready yet" and succeeds on the next poll', async () => {
    const outcome = await diagnoseWith([
      new Error('network blip'),
      { status: RecognitionStatus.DONE, diagnosis: 'Feuilles brûlées.' },
    ]);

    expect(outcome).toEqual({ diagnosis: 'Feuilles brûlées.', failed: false });
  });
});
