import type { Ref } from 'vue';
import { RecognitionStatus } from '#gql/default';
import type { IdentifyMode } from './useIdentifyEngine';

type IdentificationDeps = {
  file: Ref<File | undefined>;
  mode: Ref<IdentifyMode>;
  aiOnline: Ref<boolean>;
  checkWorker: () => Promise<void>;
};

// The failure reasons the back reports and the UI can act on (offer a personal
// Pl@ntNet key, or the user's own PC). Anything else is a plain failure.
const IDENTIFY_FAIL_REASONS = ['quota', 'limit', 'not-configured'] as const;
export type IdentifyFailReason = (typeof IDENTIFY_FAIL_REASONS)[number];

// The reason arrives as free text over the wire: narrow it to the known ones.
const toFailReason = (value: string | null | undefined): IdentifyFailReason | undefined =>
  IDENTIFY_FAIL_REASONS.find((reason): boolean => reason === value);

type UsePlantIdentification = {
  busy: Ref<boolean>;
  identifyFailed: Ref<boolean>;
  identifyReason: Ref<IdentifyFailReason | undefined>;
  identifiedSpecies: Ref<string | undefined>;
  resetIdentification: () => void;
  identify: () => Promise<string | undefined>;
};

type PollResult = { species?: string | undefined; failReason?: IdentifyFailReason | undefined };

// Cloud modes usually resolve before the enqueue call even returns; a local worker
// takes a beat longer — poll either way. The failure reason lets the UI offer a way out.
export const usePlantIdentification = ({
  file,
  mode,
  aiOnline,
  checkWorker,
}: IdentificationDeps): UsePlantIdentification => {
  const POLL_INTERVAL_MS = 800;
  // Cover a cold worker start (ComfyUI + model load) — ~3 minutes.
  const MAX_POLLS = 200;
  // Downscaled hard: full-res photos (several MB/~12MP) are what make recognition
  // slow and can exhaust an 8 GB GPU; 1024px is ample. The saved photo downscales separately.
  const IDENTIFY_MAX_SIDE = 1024;

  const { pollUntilSettled } = usePolling();

  const busy = ref(false);
  const identifyFailed = ref(false);
  // Why identification failed, when it helps the user act: 'quota' (shared Pl@ntNet
  // key exhausted/unavailable), 'limit' (their shared-key daily cap) or
  // 'not-configured'. Else undefined.
  const identifyReason = ref<IdentifyFailReason>();
  const identifiedSpecies = ref<string>();

  const resetIdentification = (): void => {
    identifyFailed.value = false;
    identifyReason.value = undefined;
    identifiedSpecies.value = undefined;
  };

  const enqueuePayload = ref<FormData>();
  const identifyQuery = ref<{ mode: IdentifyMode }>({ mode: 'auto' });
  const {
    data: enqueueData,
    error: enqueueError,
    execute: runEnqueue,
  } = useApi<{ jobId: string }>('/uploads/request-identification', {
    method: 'post',
    body: enqueuePayload,
    query: identifyQuery,
    key: 'plant-identify-enqueue',
  });

  const pollId = ref('');
  const {
    data: jobData,
    error: pollError,
    execute: runPoll,
  } = useMutation(() => GqlIdentificationJob({ id: pollId.value }));

  // Settled = DONE or FAILED; a transient read failure (a network blip) counts as
  // "not ready yet" so the wait carries on.
  const readJob = async (): Promise<PollResult | undefined> => {
    await runPoll();
    const job = pollError.value ? undefined : jobData.value?.identificationJob;
    if (job?.status === RecognitionStatus.DONE) {
      return { species: job.species ?? undefined };
    }
    if (job?.status === RecognitionStatus.FAILED) {
      return { failReason: toFailReason(job.failReason) };
    }
    return undefined;
  };

  const pollJob = async (jobId: string): Promise<PollResult> => {
    pollId.value = jobId;
    const settled = await pollUntilSettled(readJob, {
      intervalMs: POLL_INTERVAL_MS,
      maxPolls: MAX_POLLS,
    });
    return settled ?? {};
  };

  const identify = async (): Promise<string | undefined> => {
    if (file.value === undefined || busy.value) {
      return undefined;
    }
    resetIdentification();
    // Refresh the live worker status so the engine decision below is current.
    await checkWorker();
    // Honour the privacy choice — don't silently fall back to the cloud. The
    // offline hint (with the setup link) already covers telling the user why.
    if (mode.value === 'local' && !aiOnline.value) {
      return undefined;
    }

    busy.value = true;
    identifyQuery.value = { mode: mode.value };
    const form = new FormData();
    // Keep the identification copy JPEG — Pl@ntNet may reject WebP.
    const photo = await useImageDownscale(file.value, IDENTIFY_MAX_SIDE, {
      mimeType: 'image/jpeg',
    });
    form.append('file', photo, 'photo.jpg');
    enqueuePayload.value = form;
    await runEnqueue();

    const jobId = enqueueData.value?.jobId;
    if (enqueueError.value || jobId === undefined) {
      identifyFailed.value = true;
      busy.value = false;
      return undefined;
    }

    const result = await pollJob(jobId);
    busy.value = false;
    if (result.species === undefined) {
      identifyFailed.value = true;
      identifyReason.value = result.failReason;
      return undefined;
    }
    identifiedSpecies.value = result.species;
    return result.species;
  };

  return { busy, identifyFailed, identifyReason, identifiedSpecies, resetIdentification, identify };
};
