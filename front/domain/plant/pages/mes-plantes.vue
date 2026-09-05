<script setup lang="ts">
defineI18nRoute({ paths: { fr: '/mes-plantes', en: '/my-plants' } });

const { isAuthReady, isLoggedIn } = useAuth();
const { isOpen: isAuthDialogOpen, open: openAuthDialog } = useAuthDialog();

const {
  search,
  sortKey,
  genus,
  hasImage,
  petSafe,
  page,
  pageSize,
  plants,
  total,
  facets,
  aiOnline,
  semanticPending,
  isLoading,
  isReloading,
  isEmpty,
  hasError,
  refresh,
  refreshFacets,
  clearFilters,
  waterFromList,
} = usePlantCollection();

const isFormOpen = ref(false);
const editingPlant = ref<Plant | null>(null);

const openCreate = (): void => {
  editingPlant.value = null;
  isFormOpen.value = true;
};

const openEdit = (plant: Plant): void => {
  editingPlant.value = plant;
  isFormOpen.value = true;
};

const onSaved = async (): Promise<void> => {
  await Promise.all([refresh(), refreshFacets()]);
};

const deletingPlant = ref<Plant | null>(null);

const onDeleted = async (): Promise<void> => {
  void refreshFacets();
  // The row is already gone (optimistic removal). If that emptied a later page,
  // step back one; otherwise reconcile the current page with the server.
  if (plants.value.length === 0 && page.value > 1) {
    page.value -= 1;
  } else {
    await refresh();
  }
};

const isHelpOpen = ref(false);
const toolbar = ref<{ focusSearch: () => void } | null>(null);

// A dialog is open — hover/page shortcuts should stay out of its way.
const isBlocked = computed(
  (): boolean =>
    !isLoggedIn.value ||
    isFormOpen.value ||
    deletingPlant.value !== null ||
    isAuthDialogOpen.value ||
    isHelpOpen.value,
);

usePlantShortcuts({
  create: openCreate,
  search: (): void => toolbar.value?.focusSearch(),
  help: (): void => {
    isHelpOpen.value = true;
  },
  blocked: (): boolean => isBlocked.value,
});
</script>

<template>
  <main id="content" class="mx-auto w-full max-w-5xl flex-1 px-6 pt-28 pb-10">
    <PlantSkeleton v-if="!isAuthReady || isLoading" />

    <PlantSignInPrompt v-else-if="!isLoggedIn" @login="openAuthDialog" />

    <template v-else>
      <UiAnimationReveal variant="up">
        <header class="mb-12 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 class="text-highlighted text-4xl font-bold tracking-tight sm:text-5xl">
              {{ $t('plant.title') }}
            </h1>
            <p class="text-muted mt-3 text-lg">{{ $t('plant.subtitle') }}</p>
          </div>
          <div class="flex items-center gap-2">
            <UButton
              icon="i-lucide-keyboard"
              color="neutral"
              variant="ghost"
              class="hidden sm:inline-flex"
              :aria-label="$t('plant.shortcuts.title')"
              :title="$t('plant.shortcuts.hint')"
              @click="isHelpOpen = true"
            />
            <UButton icon="i-lucide-plus" size="lg" @click="openCreate">
              {{ $t('plant.add') }}
            </UButton>
          </div>
        </header>
      </UiAnimationReveal>

      <div v-if="hasError" class="flex flex-col items-start gap-4">
        <UAlert
          color="error"
          variant="soft"
          icon="i-lucide-triangle-alert"
          :title="$t('plant.error')"
          class="w-full"
        />
        <UButton color="neutral" variant="soft" icon="i-lucide-rotate-cw" @click="refresh()">
          {{ $t('plant.retry') }}
        </UButton>
      </div>

      <PlantEmpty v-else-if="isEmpty" @add="openCreate" />

      <template v-else>
        <UiAnimationReveal variant="up">
          <PlantToolbar
            ref="toolbar"
            v-model:search="search"
            v-model:sort="sortKey"
            :ai-online="aiOnline"
            :semantic-pending="semanticPending"
          />
        </UiAnimationReveal>
        <UiAnimationReveal variant="up">
          <PlantFilters
            v-model:genus="genus"
            v-model:has-image="hasImage"
            v-model:pet-safe="petSafe"
            :facets="facets"
          />
        </UiAnimationReveal>

        <!-- Fixed wrapper around the no-results/list fork: without it, toggling
             between them re-creates and re-animates the toolbar/filters above. -->
        <div>
          <p
            class="text-muted mb-6 text-sm tabular-nums"
            :class="{ 'sr-only': total === 0 }"
            role="status"
            aria-live="polite"
          >
            {{ $t('plant.resultsCount', { count: total }, { plural: total }) }}
          </p>

          <PlantNoResults v-if="plants.length === 0" @clear="clearFilters" />

          <template v-else>
            <!-- No opacity/dim on reload: it flashed on every keystroke. The
                   previous results stay put until the new ones arrive. -->
            <div :aria-busy="isReloading">
              <PlantList
                :plants="plants"
                :blocked="isBlocked"
                @edit="openEdit"
                @delete="deletingPlant = $event"
                @water="waterFromList"
              />
            </div>

            <div v-if="total > pageSize" class="mt-10 flex justify-center">
              <UPagination v-model:page="page" :total="total" :items-per-page="pageSize" />
            </div>
          </template>
        </div>
      </template>
    </template>

    <PlantFormDialog v-model:open="isFormOpen" v-model:plant="editingPlant" @saved="onSaved" />
    <PlantDeleteDialog v-model="deletingPlant" @deleted="onDeleted" />
    <PlantShortcutsHelp v-model:open="isHelpOpen" />
  </main>
</template>
