<script setup lang="ts">
const { facets } = defineProps<{ facets: PlantFacets }>();

// Value of the "all" option: a Select item needs a defined value, so "no filter"
// is this constant at the Select and `undefined` everywhere else.
const ALL_FILTER = 'all';
type AllFilter = typeof ALL_FILTER;

// Filter state is `undefined` when off; the Selects speak ALL_FILTER instead.
// The explicit default keeps Vue from casting an absent boolean model to false.
const genus = defineModel<string>('genus');
const hasImage = defineModel<boolean | undefined>('hasImage', { default: undefined });
const petSafe = defineModel<boolean | undefined>('petSafe', { default: undefined });

const genusSelection = computed({
  get: (): string => genus.value ?? ALL_FILTER,
  set: (value: string): void => {
    genus.value = value === ALL_FILTER ? undefined : value;
  },
});
const hasImageSelection = computed({
  get: (): boolean | AllFilter => hasImage.value ?? ALL_FILTER,
  set: (value: boolean | AllFilter): void => {
    hasImage.value = value === ALL_FILTER ? undefined : value;
  },
});
const petSafeSelection = computed({
  get: (): boolean | AllFilter => petSafe.value ?? ALL_FILTER,
  set: (value: boolean | AllFilter): void => {
    petSafe.value = value === ALL_FILTER ? undefined : value;
  },
});

const { t } = useNuxtApp().$i18n;

const capitalize = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

const genusItems = computed((): SelectItem<string>[] => [
  { label: t('plant.filters.allGenera'), value: ALL_FILTER },
  ...facets.genera.map((current) => ({
    label: `${capitalize(current.value)} (${current.count})`,
    value: current.value,
  })),
]);

const photoItems = computed((): SelectItem<boolean | AllFilter>[] => [
  { label: t('plant.filters.allPhotos'), value: ALL_FILTER },
  { label: `${t('plant.filters.withPhoto')} (${facets.withImage})`, value: true },
  {
    label: `${t('plant.filters.withoutPhoto')} (${facets.withoutImage})`,
    value: false,
  },
]);

const petSafeItems = computed((): SelectItem<boolean | AllFilter>[] => [
  { label: t('plant.safety.filter.all'), value: ALL_FILTER },
  { label: t('plant.safety.filter.petSafe'), value: true },
]);
</script>

<template>
  <div class="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center">
    <USelect
      v-model="genusSelection"
      :items="genusItems"
      icon="i-lucide-sprout"
      :aria-label="t('plant.filters.genus')"
      class="w-full sm:w-56"
    />
    <USelect
      v-model="hasImageSelection"
      :items="photoItems"
      icon="i-lucide-image"
      :aria-label="t('plant.filters.photo')"
      class="w-full sm:w-56"
    />
    <USelect
      v-model="petSafeSelection"
      :items="petSafeItems"
      icon="i-lucide-paw-print"
      :aria-label="t('plant.safety.filterLabel')"
      class="w-full sm:w-56"
    />
  </div>
</template>
