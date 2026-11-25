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
  diagnosis: Ref<string | undefined>;
  reset: () => void;
  diagnose: () => Promise<void>;
};

// Diagnosis is local-only (private VLM) — no cloud fallback, so surface it plainly
// when no worker is connected rather than silently doing nothing.
export const usePlantDiagnosis = ({
  plantId,
  aiOnline,
  checkWorker,
}: DiagnosisDeps): UsePlantDiagnosis => {
  const POLL_INTERVAL_MS = 800;
  // Cover a cold worker start (ComfyUI + vision model load) plus a longer
  // generation than a plain identify — ~3 minutes.
  const MAX_POLLS = 220;

  const { pollUntilSettled } = usePolling();

  const busy = ref(false);
  const failed = ref(false);
  const offline = ref(false);
  const diagnosis = ref<string>();

  const reset = (): void => {
    failed.value = false;
    offline.value = false;
    diagnosis.value = undefined;
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

  // Settled = the job is DONE (with its text, if any) or FAILED (no text); a
  // transient read failure (a network blip) counts as "not ready yet".
  const readJob = async (): Promise<{ diagnosis: string | undefined } | undefined> => {
    await runPoll();
    const job = pollError.value ? undefined : jobData.value?.diagnosisJob;
    if (job?.status === RecognitionStatus.DONE) {
      return { diagnosis: job.diagnosis ?? undefined };
    }
    if (job?.status === RecognitionStatus.FAILED) {
      return { diagnosis: undefined };
    }
    return undefined;
  };

  const pollJob = async (jobId: string): Promise<string | undefined> => {
    pollId.value = jobId;
    const settled = await pollUntilSettled(readJob, {
      intervalMs: POLL_INTERVAL_MS,
      maxPolls: MAX_POLLS,
    });
    return settled?.diagnosis;
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
    if (result === undefined || result === '') {
      failed.value = true;
      return;
    }
    diagnosis.value = result;
  };

  return { busy, failed, offline, diagnosis, reset, diagnose };
};
