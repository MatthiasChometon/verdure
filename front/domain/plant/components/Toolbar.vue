<script setup lang="ts">
const search = defineModel<string>('search', { required: true });
const sort = defineModel<PlantSortKey>('sort', { required: true });

const { t } = useNuxtApp().$i18n;

// The search is live (no form to submit), so the keyboard's Search key just
// blurs the field — which dismisses the mobile keyboard.
const dismissKeyboard = (event: KeyboardEvent): void => {
  (event.target as HTMLElement).blur();
};

// Exposed so the "/" shortcut can jump focus to the search field.
const searchInput = ref<{ inputRef?: HTMLInputElement | null } | null>(null);
defineExpose({ focusSearch: (): void => searchInput.value?.inputRef?.focus() });

const sortItems = computed((): SelectItem<PlantSortKey>[] => [
  { value: 'relevance', label: t('plant.sort.relevance') },
  { value: 'semantic', label: t('plant.sort.semantic') },
  { value: 'watering', label: t('plant.sort.watering') },
  { value: 'recent', label: t('plant.sort.recent') },
  { value: 'oldest', label: t('plant.sort.oldest') },
  { value: 'nameAsc', label: t('plant.sort.nameAsc') },
  { value: 'nameDesc', label: t('plant.sort.nameDesc') },
  { value: 'speciesAsc', label: t('plant.sort.speciesAsc') },
]);
</script>

<template>
  <div class="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <UInput
      ref="searchInput"
      v-model="search"
      type="search"
      enterkeyhint="search"
      icon="i-lucide-search"
      :placeholder="$t('plant.search.placeholder')"
      :aria-label="$t('plant.search.placeholder')"
      class="w-full sm:max-w-xs"
      @keydown.enter.prevent="dismissKeyboard"
    />
    <USelect
      v-model="sort"
      :items="sortItems"
      icon="i-lucide-arrow-up-down"
      :aria-label="$t('plant.sort.label')"
      class="w-full sm:w-56"
    />
  </div>
</template>
