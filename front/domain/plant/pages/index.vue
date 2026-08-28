<script setup lang="ts">
import type { PlantsQuery } from '#gql';

const { user, status: authStatus } = useAuth();
const isAuthDialogOpen = ref(false);

const {
  search,
  sortKey,
  genus,
  hasImage,
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
} = usePlantCollection();

const isAuthReady = computed(
  (): boolean => authStatus.value === 'success' || authStatus.value === 'error',
);
const isLoggedIn = computed((): boolean => user.value !== null);

// The "to water today" band keeps its own list; refresh it whenever the
// collection changes here so a plant leaves (or joins) it in step.
const todayBand = ref<{ reload: () => Promise<void> } | null>(null);
const reloadToday = (): void => {
  void todayBand.value?.reload();
};

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

// The shared 'plants' list cache, mutated in place for optimistic watering.
const { data: plantsCache } = useNuxtData<PlantsQuery>('plants');
const waterPlantId = ref('');
const { execute: runWater, error: waterError } = useMutation(() =>
  GqlWaterPlant({ input: { plantId: waterPlantId.value } }),
);

const onSaved = async (): Promise<void> => {
  await Promise.all([refresh(), refreshFacets()]);
  reloadToday();
};

const onWater = async (plant: Plant): Promise<void> => {
  const today = todayIso();
  waterPlantId.value = plant.id;
  // Optimistic: mark it watered today right away (the badge reads "watered today"
  // from lastWateredOn === today), roll back if the call fails.
  const ok = await optimisticUpdate(
    plantsCache,
    (current) =>
      current === null || current === undefined
        ? current
        : {
            ...current,
            plants: {
              ...current.plants,
              items: current.plants.items.map((item) =>
                item.id === plant.id ? { ...item, lastWateredOn: today } : item,
              ),
            },
          },
    { execute: runWater, error: waterError },
  );
  if (ok) {
    // Reconcile the exact next due date computed server-side.
    await refresh();
    reloadToday();
  }
};

const deletingPlant = ref<Plant | null>(null);

const onDeleted = async (): Promise<void> => {
  void refreshFacets();
  reloadToday();
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
    isFormOpen.value || deletingPlant.value !== null || isAuthDialogOpen.value || isHelpOpen.value,
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
  <div class="flex min-h-screen flex-col">
    <a href="#content" class="skip-link">{{ $t('accessibility.skip') }}</a>
    <PlantHeader v-model:open="isAuthDialogOpen" />
    <main id="content" class="mx-auto w-full max-w-5xl flex-1 px-6 pt-28 pb-10">
      <PlantSkeleton v-if="!isAuthReady || isLoading" />

      <PlantSignInPrompt v-else-if="!isLoggedIn" @login="isAuthDialogOpen = true" />

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

        <PlantTodayWatering ref="todayBand" @watered="onSaved" />

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
            <PlantFilters v-model:genus="genus" v-model:has-image="hasImage" :facets="facets" />
          </UiAnimationReveal>

          <!-- The results area (no-results OR the list) lives in one stable
               wrapper. Without it, switching between the two (e.g. a filter that
               empties the list, then back) re-creates the toolbar and filters
               above — replaying their entrance animation. Keeping this fork
               inside a fixed sibling pins their position so they're never torn
               down; only the cards animate. -->
          <div>
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
                  @water="onWater"
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
    <PlantFooter />
  </div>
</template>
