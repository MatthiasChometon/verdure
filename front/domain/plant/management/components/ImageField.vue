<script setup lang="ts">
const { initialUrl = undefined } = defineProps<{ initialUrl?: string }>();
const file = defineModel<File>();
const emit = defineEmits<{ identified: [species: string] }>();

// So the failure hint can offer to add a personal Pl@ntNet key.
const { open: openPlantnetKey } = usePlantnetKey();

const { mode, effectiveEngine, modeItems, aiOnline, checkWorker } = useIdentifyEngine();
const { busy, identifyFailed, identifyReason, identifiedSpecies, resetIdentification, identify } =
  usePlantIdentification({ file, mode, aiOnline, checkWorker });

// One static message per actionable failure reason (never a key held in a variable).
const { t } = useNuxtApp().$i18n;
const identifyReasonMessage = computed((): string | undefined => {
  switch (identifyReason.value) {
    case 'limit':
      return t('plant.form.identifyLimit');
    case 'not-configured':
      return t('plant.form.identifyNotConfigured');
    case 'quota':
      return t('plant.form.identifyQuota');
    case undefined:
      return undefined;
  }
});

const fileInput = useTemplateRef<HTMLInputElement>('fileInput');
const objectUrl = ref<string>();
const previewUrl = ref(initialUrl);

const onFileChange = (): void => {
  const selected = fileInput.value?.files?.[0];
  file.value = selected;
  if (objectUrl.value !== undefined) {
    URL.revokeObjectURL(objectUrl.value);
    objectUrl.value = undefined;
  }
  if (selected !== undefined) {
    objectUrl.value = URL.createObjectURL(selected);
    previewUrl.value = objectUrl.value;
  }
  // A new photo invalidates the previous identification result.
  resetIdentification();
};

const onIdentify = async (): Promise<void> => {
  const species = await identify();
  if (species !== undefined) {
    emit('identified', species);
  }
};

onBeforeUnmount((): void => {
  if (objectUrl.value !== undefined) {
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
        v-if="previewUrl !== undefined"
        :src="previewUrl"
        alt=""
        class="size-16 rounded-lg object-cover"
      />
    </div>

    <div v-if="file !== undefined" class="mt-2 flex flex-wrap items-center gap-2">
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

      <!-- One persistent live region: a region inserted already filled is not
           announced by many screen readers, so only its content changes. -->
      <span role="status" class="contents">
        <span
          v-if="identifiedSpecies !== undefined"
          class="text-primary inline-flex items-center gap-1 text-xs font-medium"
        >
          <UIcon name="i-lucide-circle-check" class="size-3.5" aria-hidden="true" />
          {{ $t('plant.form.identifySuccess', { species: identifiedSpecies }) }}
        </span>
        <!-- The shared Pl@ntNet key is exhausted, or the user hit their daily cap on
             it: say so and offer the way out (their own key, or their PC). -->
        <span
          v-else-if="identifyFailed && identifyReasonMessage !== undefined"
          class="text-dimmed inline-flex flex-wrap items-center gap-1 text-xs"
        >
          {{ identifyReasonMessage }}
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
      </span>

      <!-- No result yet: hint which engine will run. "My PC" chosen but offline
           points to the setup instead of leaving a silently-cloud button. -->
      <template v-if="identifiedSpecies === undefined && !identifyFailed">
        <span
          v-if="effectiveEngine === 'offline'"
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
      </template>
    </div>
  </UFormField>
</template>
