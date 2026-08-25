<script setup lang="ts">
const { initialUrl = null } = defineProps<{ initialUrl?: string | null }>();
const file = defineModel<File | null>({ required: true });
const emit = defineEmits<{ identified: [species: string] }>();

const fileInput = ref<HTMLInputElement | null>(null);
const objectUrl = ref<string | null>(null);
const previewUrl = ref<string | null>(initialUrl);

const busy = ref(false);
const identifyFailed = ref(false);
const identifiedSpecies = ref<string | null>(null);

// Live worker status, polled: the identify option is shown only when a computer
// is actually connected, and it appears on its own within a few seconds of
// pairing — no need to click and be told the worker is offline.
const aiOnline = ref(false);
const checkWorker = async (): Promise<void> => {
  try {
    aiOnline.value = (await GqlAiWorkerOnline()).aiWorkerOnline;
  } catch {
    aiOnline.value = false;
  }
};
let workerPoll: ReturnType<typeof setInterval> | undefined;
onMounted((): void => {
  void checkWorker();
  workerPoll = setInterval((): void => {
    void checkWorker();
  }, 8000);
});

const resetIdentification = (): void => {
  identifyFailed.value = false;
  identifiedSpecies.value = null;
};

const onFileChange = (): void => {
  const selected = fileInput.value?.files?.[0] ?? null;
  file.value = selected;
  if (objectUrl.value !== null) {
    URL.revokeObjectURL(objectUrl.value);
    objectUrl.value = null;
  }
  if (selected !== null) {
    objectUrl.value = URL.createObjectURL(selected);
    previewUrl.value = objectUrl.value;
  }
  // A new photo invalidates the previous identification result.
  resetIdentification();
};

// Recognition runs on the user's own worker: enqueue the photo, then poll the
// job until the worker (on their PC) has processed it.
const enqueuePayload = ref<FormData | null>(null);
const { data: enqueueData, execute: runEnqueue } = useApi<{ jobId: string }>(
  '/uploads/request-identification',
  { method: 'POST', body: enqueuePayload, key: 'plant-identify-enqueue' },
);

const POLL_INTERVAL_MS = 2000;
// Cover a cold worker start (ComfyUI + model load) — ~3 minutes.
const MAX_POLLS = 90;

const pollJob = async (jobId: string): Promise<string | null> => {
  for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
    await new Promise((resolve): void => {
      setTimeout(resolve, POLL_INTERVAL_MS);
    });
    const { identificationJob } = await GqlIdentificationJob({ id: jobId });
    const status = String(identificationJob.status);
    if (status === 'DONE') {
      return identificationJob.species ?? null;
    }
    if (status === 'FAILED') {
      return null;
    }
  }
  return null;
};

const identifyFromPhoto = async (): Promise<void> => {
  if (file.value === null || busy.value) {
    return;
  }
  resetIdentification();
  busy.value = true;
  try {
    // Re-check at the moment of use: the worker may have dropped since the last
    // poll. Reflect it in the same live flag so the UI updates on its own.
    await checkWorker();
    if (!aiOnline.value) {
      return;
    }
    const form = new FormData();
    form.append('file', file.value);
    enqueuePayload.value = form;
    await runEnqueue();
    const jobId = enqueueData.value?.jobId;
    if (jobId === undefined) {
      identifyFailed.value = true;
      return;
    }
    const species = await pollJob(jobId);
    if (species === null) {
      identifyFailed.value = true;
      return;
    }
    identifiedSpecies.value = species;
    emit('identified', species);
  } catch {
    identifyFailed.value = true;
  } finally {
    busy.value = false;
  }
};

onBeforeUnmount((): void => {
  if (workerPoll) {
    clearInterval(workerPoll);
  }
  if (objectUrl.value !== null) {
    URL.revokeObjectURL(objectUrl.value);
  }
});
</script>

<template>
  <UFormField :label="$t('plant.form.image')">
    <div class="flex items-center gap-4">
      <label
        class="border-default text-muted hover:border-primary hover:text-primary flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-4 py-2 text-sm transition-colors"
      >
        <UIcon name="i-lucide-camera" class="size-4" aria-hidden="true" />
        {{ $t('plant.form.pickImage') }}
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          class="sr-only"
          @change="onFileChange"
        />
      </label>
      <img
        v-if="previewUrl !== null"
        :src="previewUrl"
        alt=""
        class="size-16 rounded-lg object-cover"
      />
    </div>

    <div v-if="file !== null" class="mt-2 flex flex-wrap items-center gap-2">
      <!-- Shown only while a computer is actually connected: the AI option
           appears and disappears on its own as the worker comes and goes. -->
      <template v-if="aiOnline">
        <UButton
          size="xs"
          color="primary"
          variant="soft"
          icon="i-lucide-sparkles"
          :loading="busy"
          @click="identifyFromPhoto"
        >
          {{ busy ? $t('plant.form.identifying') : $t('plant.form.identify') }}
        </UButton>
        <span
          v-if="identifiedSpecies !== null"
          class="text-primary inline-flex items-center gap-1 text-xs font-medium"
        >
          <UIcon name="i-lucide-circle-check" class="size-3.5" aria-hidden="true" />
          {{ $t('plant.form.identifySuccess', { species: identifiedSpecies }) }}
        </span>
        <span v-else-if="identifyFailed" class="text-dimmed text-xs">
          {{ $t('plant.form.identifyFailed') }}
        </span>
      </template>

      <!-- No computer connected: point to the setup instead of a dead button. -->
      <span v-else class="text-dimmed inline-flex flex-wrap items-center gap-1 text-xs">
        <UIcon name="i-lucide-sparkles" class="size-3.5 shrink-0" aria-hidden="true" />
        {{ $t('plant.form.workerOffline') }}
        <NuxtLinkLocale to="/activate-ai" class="text-primary font-medium hover:underline">
          {{ $t('plant.form.activateAi') }}
        </NuxtLinkLocale>
      </span>
    </div>
  </UFormField>
</template>
