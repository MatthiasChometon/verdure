import type { Ref } from 'vue';
import type { IdentifyMode } from './useIdentifyEngine';

type IdentificationDeps = {
  file: Ref<File | null>;
  mode: Ref<IdentifyMode>;
  aiOnline: Ref<boolean>;
  checkWorker: () => Promise<void>;
};

type UsePlantIdentification = {
  busy: Ref<boolean>;
  identifyFailed: Ref<boolean>;
  identifyReason: Ref<string | null>;
  identifiedSpecies: Ref<string | null>;
  resetIdentification: () => void;
  identify: () => Promise<string | null>;
};

type PollResult = { species: string | null; failReason: string | null };

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

  const busy = ref(false);
  const identifyFailed = ref(false);
  // Why identification failed, when it helps the user act: 'quota' (shared Pl@ntNet
  // key exhausted/unavailable) or 'limit' (their shared-key daily cap). Else null.
  const identifyReason = ref<string | null>(null);
  const identifiedSpecies = ref<string | null>(null);

  const resetIdentification = (): void => {
    identifyFailed.value = false;
    identifyReason.value = null;
    identifiedSpecies.value = null;
  };

  const enqueuePayload = ref<FormData | null>(null);
  const identifyQuery = ref<{ mode: IdentifyMode }>({ mode: 'auto' });
  const {
    data: enqueueData,
    error: enqueueError,
    execute: runEnqueue,
  } = useApi<{ jobId: string }>('/uploads/request-identification', {
    method: 'POST',
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

  const pollJob = async (jobId: string): Promise<PollResult> => {
    pollId.value = jobId;
    for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
      // Check first, then wait: a warm worker (and any cloud result) finishes fast,
      // so we pick the result up as soon as it's ready instead of after a delay.
      await runPoll();
      // A transient read failure (a network blip) shouldn't abort the whole wait —
      // treat it like "not ready yet" and poll again.
      const job = pollError.value ? undefined : jobData.value?.identificationJob;
      if (job !== undefined) {
        const status = String(job.status);
        if (status === 'DONE') {
          return { species: job.species ?? null, failReason: null };
        }
        if (status === 'FAILED') {
          return { species: null, failReason: job.failReason ?? null };
        }
      }
      await new Promise((resolve): void => {
        setTimeout(resolve, POLL_INTERVAL_MS);
      });
    }
    return { species: null, failReason: null };
  };

  const identify = async (): Promise<string | null> => {
    if (file.value === null || busy.value) {
      return null;
    }
    resetIdentification();
    // Refresh the live worker status so the engine decision below is current.
    await checkWorker();
    // Honour the privacy choice — don't silently fall back to the cloud. The
    // offline hint (with the setup link) already covers telling the user why.
    if (mode.value === 'local' && !aiOnline.value) {
      return null;
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
      return null;
    }

    const result = await pollJob(jobId);
    busy.value = false;
    if (result.species === null) {
      identifyFailed.value = true;
      identifyReason.value = result.failReason;
      return null;
    }
    identifiedSpecies.value = result.species;
    return result.species;
  };

  return { busy, identifyFailed, identifyReason, identifiedSpecies, resetIdentification, identify };
};
