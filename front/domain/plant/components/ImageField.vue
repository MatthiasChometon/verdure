<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';
import { downscaleImage } from '../composables/imageDownscale';

const { initialUrl = null } = defineProps<{ initialUrl?: string | null }>();
const file = defineModel<File | null>({ required: true });
const emit = defineEmits<{ identified: [species: string] }>();

const { t } = useNuxtApp().$i18n;

const fileInput = ref<HTMLInputElement | null>(null);
const objectUrl = ref<string | null>(null);
const previewUrl = ref<string | null>(initialUrl);

const busy = ref(false);
const identifyFailed = ref(false);
// Why identification failed, when it helps the user act: 'quota' (shared Pl@ntNet
// key exhausted/unavailable) or 'limit' (their shared-key daily cap). Else null.
const identifyReason = ref<string | null>(null);
const identifiedSpecies = ref<string | null>(null);

// So the failure hint can offer to add a personal Pl@ntNet key.
const { open: openPlantnetKey } = usePlantnetKey();

// Which engine identifies the photo. `cloud` (default) uses Pl@ntNet — faster and
// more accurate at plants than the local model; `local` insists on the user's own
// worker (private, never leaves the PC). `auto` is a legacy stored value (it used
// to prefer the worker) and is treated as cloud.
type IdentifyMode = 'auto' | 'cloud' | 'local';
const MODE_STORAGE_KEY = 'verdure-identify-mode';
const mode = ref<IdentifyMode>('cloud');

// Live worker status, polled: drives the local/cloud hint and gates the "My PC"
// option, and it settles on its own within a few seconds of pairing.
const { online: aiOnline, refresh: checkWorker } = useAiWorker();

onMounted((): void => {
  try {
    const saved = localStorage.getItem(MODE_STORAGE_KEY);
    // 'auto' is a legacy value (it used to prefer the worker) — treat it as cloud.
    if (saved === 'local') {
      mode.value = 'local';
    } else if (saved === 'auto' || saved === 'cloud') {
      mode.value = 'cloud';
    }
  } catch {
    // Storage may be unavailable (private mode) — keep the default.
  }
});

const setMode = (next: IdentifyMode): void => {
  mode.value = next;
  try {
    localStorage.setItem(MODE_STORAGE_KEY, next);
  } catch {
    // The preference just won't persist across visits; not worth surfacing.
  }
};

// The engine that WILL run given the current mode and worker status — drives the
// hint under the button. `offline` = "My PC" chosen but nothing is connected.
const effectiveEngine = computed<'local' | 'cloud' | 'offline'>(() => {
  if (mode.value === 'cloud') {
    return 'cloud';
  }
  if (mode.value === 'local') {
    return aiOnline.value ? 'local' : 'offline';
  }
  // Auto uses Pl@ntNet (faster + more accurate for plants); the worker runs only
  // on the explicit "my PC" choice.
  return 'cloud';
});

// A checkbox item shows a check on the active engine; picking another switches
// to it, and re-picking the active one (checked → false) is a no-op (radio-like).
const modeItems = computed<DropdownMenuItem[]>(() => [
  {
    label: t('plant.form.engineCloud'),
    icon: 'i-lucide-cloud',
    type: 'checkbox',
    checked: mode.value === 'cloud',
    onUpdateChecked: (checked: boolean): void => {
      if (checked) {
        setMode('cloud');
      }
    },
  },
  {
    label: t('plant.form.engineLocal'),
    icon: 'i-lucide-shield-check',
    type: 'checkbox',
    checked: mode.value === 'local',
    // No worker to run on: offer it, but disabled, so the choice is discoverable.
    disabled: !aiOnline.value,
    onUpdateChecked: (checked: boolean): void => {
      if (checked) {
        setMode('local');
      }
    },
  },
]);

const resetIdentification = (): void => {
  identifyFailed.value = false;
  identifyReason.value = null;
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

// Enqueue the photo, then poll the job until it is resolved. Cloud modes finish
// server-side before the enqueue call even returns (the first poll already reads
// DONE); a local worker resolves it a beat later once it has processed the job.
const enqueuePayload = ref<FormData | null>(null);
const identifyQuery = ref<{ mode: IdentifyMode }>({ mode: 'auto' });
const { data: enqueueData, execute: runEnqueue } = useApi<{ jobId: string }>(
  '/uploads/request-identification',
  {
    method: 'POST',
    body: enqueuePayload,
    query: identifyQuery,
    key: 'plant-identify-enqueue',
  },
);

const POLL_INTERVAL_MS = 800;
// Cover a cold worker start (ComfyUI + model load) — ~3 minutes.
const MAX_POLLS = 200;

type PollResult = { species: string | null; failReason: string | null };

const pollJob = async (jobId: string): Promise<PollResult> => {
  for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
    // Check first, then wait: a warm worker (and any cloud result) finishes fast,
    // so we pick the result up as soon as it's ready instead of after a delay.
    const { identificationJob } = await GqlIdentificationJob({ id: jobId });
    const status = String(identificationJob.status);
    if (status === 'DONE') {
      return { species: identificationJob.species ?? null, failReason: null };
    }
    if (status === 'FAILED') {
      return { species: null, failReason: identificationJob.failReason ?? null };
    }
    await new Promise((resolve): void => {
      setTimeout(resolve, POLL_INTERVAL_MS);
    });
  }
  return { species: null, failReason: null };
};

// The copy sent to identification is downscaled hard (shared downscaleImage): a
// phone photo is several MB / ~12 MP, and shipping it (phone → back → worker) plus
// running the vision model on it is what makes recognition slow — a full-res image
// can even exhaust an 8 GB GPU. 1024 px on the longest side is ample to identify a
// plant. (The saved photo is downscaled separately at upload, to a larger size.)
const IDENTIFY_MAX_SIDE = 1024;

const identifyFromPhoto = async (): Promise<void> => {
  if (file.value === null || busy.value) {
    return;
  }
  resetIdentification();
  // Refresh the live worker status so the engine decision below is current.
  await checkWorker();
  // "My PC only" but nothing is connected: honour the privacy choice — don't
  // silently fall back to the cloud. The offline hint (with the setup link) is
  // already showing, so there's nothing more to do.
  if (mode.value === 'local' && !aiOnline.value) {
    return;
  }
  busy.value = true;
  try {
    identifyQuery.value = { mode: mode.value };
    const form = new FormData();
    // Keep the identification copy JPEG — Pl@ntNet may reject WebP.
    const photo = await downscaleImage(file.value, IDENTIFY_MAX_SIDE, {
      mimeType: 'image/jpeg',
    });
    form.append('file', photo, 'photo.jpg');
    enqueuePayload.value = form;
    await runEnqueue();
    const jobId = enqueueData.value?.jobId;
    if (jobId === undefined) {
      identifyFailed.value = true;
      return;
    }
    const result = await pollJob(jobId);
    if (result.species === null) {
      identifyFailed.value = true;
      identifyReason.value = result.failReason;
      return;
    }
    identifiedSpecies.value = result.species;
    emit('identified', result.species);
  } catch {
    identifyFailed.value = true;
  } finally {
    busy.value = false;
  }
};

onBeforeUnmount((): void => {
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
      <!-- Available to everyone: Pl@ntNet by default, the user's own PC when it's
           connected. The chevron opens the engine choice (auto / cloud / my PC). -->
      <UButtonGroup size="xs">
        <UButton
          color="primary"
          variant="soft"
          icon="i-lucide-sparkles"
          :loading="busy"
          @click="identifyFromPhoto"
        >
          {{ busy ? $t('plant.form.identifying') : $t('plant.form.identify') }}
        </UButton>
        <UDropdownMenu :items="modeItems">
          <UButton
            color="primary"
            variant="soft"
            icon="i-lucide-chevron-down"
            :aria-label="$t('plant.form.engineMenu')"
          />
        </UDropdownMenu>
      </UButtonGroup>

      <span
        v-if="identifiedSpecies !== null"
        class="text-primary inline-flex items-center gap-1 text-xs font-medium"
      >
        <UIcon name="i-lucide-circle-check" class="size-3.5" aria-hidden="true" />
        {{ $t('plant.form.identifySuccess', { species: identifiedSpecies }) }}
      </span>
      <!-- The shared Pl@ntNet key is exhausted, or the user hit their daily cap on
           it: say so and offer the way out (their own key, or their PC). -->
      <span
        v-else-if="identifyFailed && (identifyReason === 'quota' || identifyReason === 'limit')"
        class="text-dimmed inline-flex flex-wrap items-center gap-1 text-xs"
      >
        {{
          identifyReason === 'limit'
            ? $t('plant.form.identifyLimit')
            : $t('plant.form.identifyQuota')
        }}
        <button
          type="button"
          class="text-primary font-medium hover:underline"
          @click="openPlantnetKey"
        >
          {{ $t('plant.form.addPlantnetKey') }}
        </button>
      </span>
      <span v-else-if="identifyFailed" class="text-dimmed text-xs">
        {{ $t('plant.form.identifyFailed') }}
      </span>

      <!-- No result yet: hint which engine will run. "My PC" chosen but offline
           points to the setup instead of leaving a silently-cloud button. -->
      <span
        v-else-if="effectiveEngine === 'offline'"
        class="text-dimmed inline-flex flex-wrap items-center gap-1 text-xs"
      >
        <UIcon name="i-lucide-sparkles" class="size-3.5 shrink-0" aria-hidden="true" />
        {{ $t('plant.form.workerOffline') }}
        <NuxtLinkLocale to="/activate-ai" class="text-primary font-medium hover:underline">
          {{ $t('plant.form.activateAi') }}
        </NuxtLinkLocale>
      </span>
      <span v-else class="text-dimmed inline-flex items-center gap-1 text-xs">
        <UIcon
          :name="effectiveEngine === 'local' ? 'i-lucide-shield-check' : 'i-lucide-cloud'"
          class="size-3.5"
          aria-hidden="true"
        />
        {{
          effectiveEngine === 'local'
            ? $t('plant.form.identifyLocal')
            : $t('plant.form.identifyCloud')
        }}
      </span>
    </div>
  </UFormField>
</template>
