<script setup lang="ts">
const { initialUrl = null } = defineProps<{ initialUrl?: string | null }>();
const file = defineModel<File | null>({ required: true });
const emit = defineEmits<{ identified: [species: string] }>();

// So the failure hint can offer to add a personal Pl@ntNet key.
const { open: openPlantnetKey } = usePlantnetKey();

const { mode, effectiveEngine, modeItems, aiOnline, checkWorker } = useIdentifyEngine();
const { busy, identifyFailed, identifyReason, identifiedSpecies, resetIdentification, identify } =
  usePlantIdentification({ file, mode, aiOnline, checkWorker });

const fileInput = ref<HTMLInputElement | null>(null);
const objectUrl = ref<string | null>(null);
const previewUrl = ref<string | null>(initialUrl);

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

const onIdentify = async (): Promise<void> => {
  const species = await identify();
  if (species !== null) {
    emit('identified', species);
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
          @click="onIdentify"
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
