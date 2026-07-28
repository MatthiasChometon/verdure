<script setup lang="ts">
const { facets } = defineProps<{ facets: PlantFacets }>();

const genus = defineModel<string | null>('genus', { required: true });
const hasImage = defineModel<boolean | null>('hasImage', { required: true });

const { t } = useNuxtApp().$i18n;

const capitalize = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

const genusItems = computed((): SelectItem<string | null>[] => [
  { label: t('plant.filters.allGenera'), value: null },
  ...facets.genera.map((current) => ({
    label: `${capitalize(current.value)} (${current.count})`,
    value: current.value,
  })),
]);

const photoItems = computed((): SelectItem<boolean | null>[] => [
  { label: t('plant.filters.allPhotos'), value: null },
  { label: `${t('plant.filters.withPhoto')} (${facets.withImage})`, value: true },
  {
    label: `${t('plant.filters.withoutPhoto')} (${facets.withoutImage})`,
    value: false,
  },
]);
</script>

<template>
  <div class="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center">
    <USelect
      v-model="genus"
      :items="genusItems"
      icon="i-lucide-sprout"
      :aria-label="t('plant.filters.genus')"
      class="w-full sm:w-56"
    />
    <USelect
      v-model="hasImage"
      :items="photoItems"
      icon="i-lucide-image"
      :aria-label="t('plant.filters.photo')"
      class="w-full sm:w-56"
    />
  </div>
</template>
