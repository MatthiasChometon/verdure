<script setup lang="ts">
import { downscaleImage } from '../../composables/imageDownscale';

const { plant = null } = defineProps<{ plant?: Plant | null }>();

const { nameMaxLength, descriptionMaxLength } = usePlantConstraints();

const emit = defineEmits<{ saved: [] }>();

const isEditing = plant !== null;

const name = ref(plant?.name ?? '');
const species = ref(plant?.species ?? '');
const description = ref(plant?.description ?? '');
const file = ref<File | null>(null);

const summerDays = ref<number | null>(plant?.wateringIntervalSummerDays ?? null);
const winterDays = ref<number | null>(plant?.wateringIntervalWinterDays ?? null);
const lastWateredOn = ref<string | null>(plant?.lastWateredOn ?? null);

const nameCount = computed((): string => `${name.value.length}/${nameMaxLength}`);
const nameAtMax = computed((): boolean => name.value.length >= nameMaxLength);
const descriptionCount = computed(
  (): string => `${description.value.length}/${descriptionMaxLength}`,
);
const descriptionAtMax = computed((): boolean => description.value.length >= descriptionMaxLength);

const { locale } = useNuxtApp().$i18n;

// Suggest a fun nickname (a pun on the species when one is picked) in the user's
// language, guaranteed unique in their collection. Re-clickable for another one.
const { status: nameStatus, execute: runSuggestName } = useQuery(
  'plant-name-suggest',
  async (): Promise<string | null> => {
    const result = await GqlSuggestPlantName({
      species: species.value.trim() === '' ? null : species.value,
      lang: locale.value,
    });
    const suggested = result.suggestPlantName ?? null;
    if (suggested !== null) {
      name.value = suggested;
    }
    return suggested;
  },
);
const suggestingName = computed((): boolean => nameStatus.value === 'pending');

const uploadPayload = ref<FormData | null>(null);
const {
  data: uploadResult,
  error: uploadError,
  execute: runUpload,
} = useApi<{ key: string }>('/uploads/plant-image', {
  method: 'POST',
  body: uploadPayload,
  key: 'plant-image-upload',
});

// Every stored plant photo is bounded to a consistent size before upload — a
// phone photo is several MB / ~12 MP, far more than the cards or the detail view
// need. 1280 px on the longest side stays crisp at a fraction of the weight.
const STORAGE_MAX_SIDE = 1280;

const uploadImage = async (image: File): Promise<string> => {
  // WebP when the browser can encode it (smaller), JPEG otherwise — never PNG.
  const stored = await downscaleImage(image, STORAGE_MAX_SIDE);
  const name = stored.type === 'image/webp' ? 'plant.webp' : 'plant.jpg';
  const form = new FormData();
  form.append('file', stored, name);
  uploadPayload.value = form;
  await runUpload();
  if (uploadError.value || !uploadResult.value) {
    throw uploadError.value ?? new Error('Image upload failed.');
  }
  return uploadResult.value.key;
};

const {
  status: saveStatus,
  error: saveError,
  execute: executeSave,
} = useMutation(async (): Promise<void> => {
  const imageKey = file.value === null ? null : await uploadImage(file.value);
  const base = {
    name: name.value,
    species: species.value,
    description: description.value.trim() || null,
    imageKey,
    wateringIntervalSummerDays: summerDays.value,
    wateringIntervalWinterDays: winterDays.value,
  };

  let plantId: string;
  if (plant === null) {
    const { createPlant } = await GqlCreatePlant({ input: base });
    plantId = createPlant.id;
  } else {
    await GqlUpdatePlant({ input: { id: plant.id, ...base } });
    plantId = plant.id;
  }

  // Anchor the watering cycle when tracking is enabled and the reference date
  // was set or changed — a no-op edit does not add a spurious watering.
  const anchorChanged = lastWateredOn.value !== (plant?.lastWateredOn ?? null);
  if (summerDays.value !== null && lastWateredOn.value !== null && anchorChanged) {
    await GqlWaterPlant({ input: { plantId, wateredOn: lastWateredOn.value } });
  }
});

const submitting = computed((): boolean => saveStatus.value === 'pending');

const submit = async (): Promise<void> => {
  await executeSave();
  if (!saveError.value) {
    emit('saved');
  }
};
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="submit">
    <UFormField :label="$t('plant.form.name')" required>
      <template #hint>
        <span class="text-xs tabular-nums" :class="nameAtMax ? 'text-warning' : 'text-dimmed'">
          {{ nameCount }}
        </span>
      </template>
      <div class="flex items-center gap-2">
        <UInput
          v-model="name"
          required
          :maxlength="nameMaxLength"
          enterkeyhint="next"
          class="flex-1"
        />
        <UButton
          icon="i-lucide-dices"
          color="primary"
          variant="soft"
          square
          :loading="suggestingName"
          :aria-label="$t('plant.form.suggestName')"
          :title="$t('plant.form.suggestName')"
          @click="() => runSuggestName()"
        />
      </div>
    </UFormField>

    <PlantSaveSpeciesField v-model="species" />

    <UFormField :label="$t('plant.form.description')">
      <template #hint>
        <span
          class="text-xs tabular-nums"
          :class="descriptionAtMax ? 'text-warning' : 'text-dimmed'"
        >
          {{ descriptionCount }}
        </span>
      </template>
      <UTextarea
        v-model="description"
        :rows="3"
        :maxlength="descriptionMaxLength"
        :placeholder="$t('plant.form.descriptionPlaceholder')"
        class="w-full"
      />
    </UFormField>

    <PlantSaveImageField
      v-model="file"
      :initial-url="plant?.imageUrl ?? null"
      @identified="species = $event"
    />

    <PlantWateringFields
      v-model:summer-days="summerDays"
      v-model:winter-days="winterDays"
      v-model:last-watered-on="lastWateredOn"
      :species="species"
    />

    <UAlert
      v-if="saveError"
      color="error"
      variant="soft"
      icon="i-lucide-triangle-alert"
      :title="$t('plant.form.error')"
    />

    <div class="flex justify-end">
      <UButton type="submit" :loading="submitting" :disabled="name === '' || species === ''">
        {{ isEditing ? $t('plant.form.save') : $t('plant.form.submit') }}
      </UButton>
    </div>
  </form>
</template>
