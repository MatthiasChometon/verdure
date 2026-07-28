<script setup lang="ts">
const { initialUrl = null } = defineProps<{ initialUrl?: string | null }>();
const file = defineModel<File | null>({ required: true });
const emit = defineEmits<{ identified: [species: string] }>();

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
  identifyFailed.value = false;
  identifiedSpecies.value = null;
};

const identifyPayload = ref<FormData | null>(null);
const {
  data: identifyData,
  status: identifyStatus,
  execute: runIdentify,
} = useApi<{ species: string | null }>('/uploads/identify-plant', {
  method: 'POST',
  body: identifyPayload,
  key: 'plant-identify',
});

const identifying = computed((): boolean => identifyStatus.value === 'pending');
const identifyFailed = ref(false);
const identifiedSpecies = ref<string | null>(null);

const identifyFromPhoto = async (): Promise<void> => {
  if (file.value === null) {
    return;
  }
  identifyFailed.value = false;
  identifiedSpecies.value = null;
  const form = new FormData();
  form.append('file', file.value);
  identifyPayload.value = form;
  await runIdentify();
  const identified = identifyData.value?.species ?? null;
  if (identified === null) {
    identifyFailed.value = true;
    return;
  }
  identifiedSpecies.value = identified;
  emit('identified', identified);
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
      <img v-if="previewUrl !== null" :src="previewUrl" alt="" class="size-16 rounded-lg object-cover" />
    </div>

    <div v-if="file !== null" class="mt-2 flex items-center gap-2">
      <UButton
        size="xs"
        color="primary"
        variant="soft"
        icon="i-lucide-sparkles"
        :loading="identifying"
        @click="identifyFromPhoto"
      >
        {{ $t('plant.form.identify') }}
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
    </div>
  </UFormField>
</template>
