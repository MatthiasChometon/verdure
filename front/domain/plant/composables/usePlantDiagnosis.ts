import type { Ref } from 'vue';
import { RecognitionStatus } from '#gql/default';

type DiagnosisDeps = {
  plantId: Ref<string>;
  aiOnline: Ref<boolean>;
  checkWorker: () => Promise<void>;
};

type UsePlantDiagnosis = {
  busy: Ref<boolean>;
  failed: Ref<boolean>;
  offline: Ref<boolean>;
  diagnosis: Ref<string | null>;
  reset: () => void;
  diagnose: () => Promise<void>;
};

const POLL_INTERVAL_MS = 800;
// Cover a cold worker start (ComfyUI + vision model load) plus a longer
// generation than a plain identify — ~3 minutes.
const MAX_POLLS = 220;

// Ask the user's local worker to assess a plant's health from its stored photo:
// enqueue the diagnosis, then poll the job until it resolves. Diagnosis is
// local-only (private VLM) — there is no cloud fallback, so when no worker is
// connected we surface that rather than silently doing nothing.
export const usePlantDiagnosis = ({
  plantId,
  aiOnline,
  checkWorker,
}: DiagnosisDeps): UsePlantDiagnosis => {
  const busy = ref(false);
  const failed = ref(false);
  const offline = ref(false);
  const diagnosis = ref<string | null>(null);

  const reset = (): void => {
    failed.value = false;
    offline.value = false;
    diagnosis.value = null;
  };

  const {
    data: enqueueData,
    error: enqueueError,
    execute: runEnqueue,
  } = useMutation(() => GqlDiagnosePlant({ plantId: plantId.value }));

  const pollId = ref('');
  const {
    data: jobData,
    error: pollError,
    execute: runPoll,
  } = useMutation(() => GqlDiagnosisJob({ id: pollId.value }));

  const pollJob = async (jobId: string): Promise<string | null> => {
    pollId.value = jobId;
    for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
      await runPoll();
      // A transient read failure (a network blip) shouldn't abort the whole
      // wait — treat it like "not ready yet" and poll again.
      const job = pollError.value ? undefined : jobData.value?.diagnosisJob;
      if (job !== undefined) {
        if (job.status === RecognitionStatus.DONE) {
          return job.diagnosis ?? null;
        }
        if (job.status === RecognitionStatus.FAILED) {
          return null;
        }
      }
      await new Promise((resolve): void => {
        setTimeout(resolve, POLL_INTERVAL_MS);
      });
    }
    return null;
  };

  const diagnose = async (): Promise<void> => {
    if (busy.value) {
      return;
    }
    reset();
    // Refresh the live worker status so the decision below is current.
    await checkWorker();
    if (!aiOnline.value) {
      offline.value = true;
      return;
    }

    busy.value = true;
    await runEnqueue();
    const jobId = enqueueData.value?.diagnosePlant.id;
    if (enqueueError.value || jobId === undefined) {
      failed.value = true;
      busy.value = false;
      return;
    }

    const result = await pollJob(jobId);
    busy.value = false;
    if (result === null || result === '') {
      failed.value = true;
      return;
    }
    diagnosis.value = result;
  };

  return { busy, failed, offline, diagnosis, reset, diagnose };
};
