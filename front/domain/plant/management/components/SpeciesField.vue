<script setup lang="ts">
const species = defineModel<string>({ required: true });

const query = ref('');
const debouncedQuery = refDebounced(query, 250);

const { data, status } = useQuery(
  'species-suggestions',
  () =>
    debouncedQuery.value.trim().length < 2
      ? Promise.resolve({ speciesSuggestions: [] })
      : GqlSpeciesSuggestions({ search: debouncedQuery.value }),
  {
    server: false,
    watch: [debouncedQuery],
    default: () => ({ speciesSuggestions: [] }),
  },
);

const loading = computed((): boolean => status.value === 'pending');
const items = computed((): string[] => {
  const names = (data.value?.speciesSuggestions ?? []).map((current) => current.name);
  // Keep the current selection in the list so the menu can render its label.
  if (species.value !== '' && !names.includes(species.value)) {
    return [species.value, ...names];
  }
  return names;
});
</script>

<template>
  <UFormField :label="$t('plant.form.species')" required>
    <USelectMenu
      v-model="species"
      v-model:search-term="query"
      :items="items"
      :search-input="{
        placeholder: $t('plant.form.speciesSearch'),
        loading,
      }"
      ignore-filter
      icon="i-lucide-leaf"
      :placeholder="$t('plant.form.speciesPlaceholder')"
      class="w-full"
    />
  </UFormField>
</template>
