<script setup lang="ts">
// Semantic ranking needs a connected GPU worker to embed the query; `semanticPending`
// is true while it's still computing the query's vector.
const { aiOnline = false, semanticPending = false } = defineProps<{
  aiOnline?: boolean;
  semanticPending?: boolean;
}>();

const search = defineModel<string>('search', { required: true });
const sort = defineModel<PlantSortKey>('sort', { required: true });

const { t } = useNuxtApp().$i18n;

// The search is live (no form to submit), so the keyboard's Search key just
// blurs the field — which dismisses the mobile keyboard.
const dismissKeyboard = (event: KeyboardEvent): void => {
  if (event.target instanceof HTMLElement) {
    event.target.blur();
  }
};

// Exposed so the "/" shortcut can jump focus to the search field.
const searchInput = ref<{ inputRef?: HTMLInputElement | null } | null>(null);
defineExpose({ focusSearch: (): void => searchInput.value?.inputRef?.focus() });

const sortItems = computed((): SelectItem<PlantSortKey>[] => [
  { value: 'relevance', label: t('plant.sort.relevance') },
  { value: 'semantic', label: t('plant.sort.semantic'), disabled: !aiOnline },
  { value: 'needsCare', label: t('plant.sort.needsCare') },
  { value: 'watering', label: t('plant.sort.watering') },
  { value: 'recent', label: t('plant.sort.recent') },
  { value: 'oldest', label: t('plant.sort.oldest') },
  { value: 'nameAsc', label: t('plant.sort.nameAsc') },
  { value: 'nameDesc', label: t('plant.sort.nameDesc') },
  { value: 'speciesAsc', label: t('plant.sort.speciesAsc') },
]);
</script>

<template>
  <div class="mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div class="w-full sm:max-w-xs">
      <UInput
        ref="searchInput"
        v-model="search"
        type="search"
        enterkeyhint="search"
        icon="i-lucide-search"
        :placeholder="$t('plant.search.placeholder')"
        :aria-label="$t('plant.search.placeholder')"
        class="w-full"
        @keydown.enter.prevent="dismissKeyboard"
      />
      <!-- A connected worker unlocks semantic ranking: tell the user it's on,
           and that it is computing while the worker embeds the query. -->
      <p v-if="aiOnline" class="text-primary mt-1.5 flex items-center gap-1 text-xs font-medium">
        <UIcon
          :name="semanticPending ? 'i-lucide-loader-circle' : 'i-lucide-sparkles'"
          :class="['size-3.5 shrink-0', { 'animate-spin': semanticPending }]"
          aria-hidden="true"
        />
        {{
          semanticPending ? $t('plant.search.advancedComputing') : $t('plant.search.advancedActive')
        }}
      </p>
    </div>
    <USelect
      v-model="sort"
      :items="sortItems"
      icon="i-lucide-arrow-up-down"
      :aria-label="$t('plant.sort.label')"
      class="w-full sm:w-56"
    />
  </div>
</template>
