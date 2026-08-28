<script setup lang="ts">
const { user, status: authStatus } = useAuth();

const isAuthDialogOpen = ref(false);

const search = ref('');
const debouncedSearch = refDebounced(search, 300);
const sortKey = ref<PlantSortKey>('relevance');
const genus = ref<string | null>(null);
const hasImage = ref<boolean | null>(null);
const page = ref(1);
const pageSize = 12;

// A connected GPU worker unlocks semantic (advanced) ranking — it needs the
// worker to embed the query. Default to it when one is online, and fall back to
// the simple relevance ranking when the worker drops (the toolbar disables the
// option then).
const { online: aiOnline } = useAiWorker();
watch(
  aiOnline,
  (online, wasOnline): void => {
    if (online && wasOnline !== true) {
      sortKey.value = 'semantic';
    } else if (!online && sortKey.value === 'semantic') {
      sortKey.value = 'relevance';
    }
  },
  { immediate: true },
);

// Reset to the first page whenever the query changes; declared before useQuery
// so its watcher runs first and the fetch uses offset 0.
watch([debouncedSearch, sortKey, genus, hasImage], () => {
  page.value = 1;
});

const { data, status, error, refresh } = useQuery(
  'plants',
  () =>
    GqlPlants({
      search: debouncedSearch.value || undefined,
      ...usePlantSort(sortKey.value),
      genus: genus.value ?? undefined,
      hasImage: hasImage.value ?? undefined,
      limit: pageSize,
      offset: (page.value - 1) * pageSize,
    }),
  {
    server: false,
    watch: [debouncedSearch, sortKey, genus, hasImage, page],
  },
);

// Semantic ranking is computed by the user's worker asynchronously (its vector
// comes back through the job queue). While the back reports it pending, the rows
// shown are the keyword fallback; retry a few times so the semantic order lands
// once the worker answers, without hammering. Reset the budget on a new query.
const MAX_SEMANTIC_RETRIES = 8;
const SEMANTIC_RETRY_MS = 1200;
const semanticRetries = ref(0);
const semanticPending = computed((): boolean => data.value?.plants.semanticPending ?? false);
watch([debouncedSearch, sortKey], () => {
  semanticRetries.value = 0;
});
watch(data, (): void => {
  if (!semanticPending.value || semanticRetries.value >= MAX_SEMANTIC_RETRIES) {
    return;
  }
  semanticRetries.value += 1;
  setTimeout((): void => {
    if (semanticPending.value) {
      void refresh();
    }
  }, SEMANTIC_RETRY_MS);
});

const emptyFacets: PlantFacets = { genera: [], withImage: 0, withoutImage: 0 };

// Facets follow the search (not the genus/photo filters) so every option stays
// selectable with its count.
const { data: facetsData, refresh: refreshFacets } = useQuery(
  'plant-facets',
  () => GqlPlantFacets({ search: debouncedSearch.value || undefined }),
  {
    server: false,
    watch: [debouncedSearch],
    default: () => ({ plantFacets: emptyFacets }),
  },
);
const facets = computed((): PlantFacets => facetsData.value?.plantFacets ?? emptyFacets);

// Plants are private: fetch them only once the visitor is known to be authenticated.
watch(
  user,
  (current) => {
    if (current) {
      refresh();
      refreshFacets();
    }
  },
  { immediate: true },
);

const isAuthReady = computed(
  (): boolean => authStatus.value === 'success' || authStatus.value === 'error',
);
const isLoggedIn = computed((): boolean => user.value !== null);

const plants = computed((): Plant[] => data.value?.plants.items ?? []);
const total = computed((): number => data.value?.plants.total ?? 0);
const isLoading = computed((): boolean => isLoggedIn.value && data.value === undefined);
const isReloading = computed((): boolean => status.value === 'pending' && data.value !== undefined);
const hasActiveFilters = computed(
  (): boolean => debouncedSearch.value !== '' || genus.value !== null || hasImage.value !== null,
);
// "Empty collection" (the onboarding state) — never during a reload. While a
// filter change refetches, `plants` still holds the previous result: clearing a
// filter that emptied the list would otherwise flip this true for one tick,
// unmounting (and re-animating) the whole toolbar/filters block. Gate on the
// reload so it only reflects a settled, genuinely empty collection.
const isEmpty = computed(
  (): boolean => plants.value.length === 0 && !hasActiveFilters.value && !isReloading.value,
);

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

const onWater = async (plant: Plant): Promise<void> => {
  const today = todayIso();
  // Optimistic: mark it watered today right away (the badge reads
  // "watered today" from lastWateredOn === today), roll back if the call fails.
  const ok = await optimisticUpdate(
    data,
    (current) =>
      current === undefined
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
    () => GqlWaterPlant({ input: { plantId: plant.id } }),
  );
  if (ok) {
    // Reconcile the exact next due date computed server-side.
    await refresh();
  }
};

const deletingPlant = ref<Plant | null>(null);

const onDeleted = async (): Promise<void> => {
  refreshFacets();
  // The row is already gone (optimistic removal). If that emptied a later page,
  // step back one; otherwise reconcile the current page with the server.
  if (plants.value.length === 0 && page.value > 1) {
    page.value -= 1;
  } else {
    await refresh();
  }
};

const clearFilters = (): void => {
  search.value = '';
  genus.value = null;
  hasImage.value = null;
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

        <div v-if="error" class="flex flex-col items-start gap-4">
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
