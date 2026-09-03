import type { PlantsQuery } from '#gql';
import type { ComputedRef, Ref } from 'vue';

type UsePlantCollection = {
  search: Ref<string>;
  sortKey: Ref<PlantSortKey>;
  genus: Ref<string | null>;
  hasImage: Ref<boolean | null>;
  petSafe: Ref<boolean | null>;
  page: Ref<number>;
  pageSize: number;
  plants: ComputedRef<Plant[]>;
  total: ComputedRef<number>;
  facets: ComputedRef<PlantFacets>;
  aiOnline: Ref<boolean>;
  semanticPending: ComputedRef<boolean>;
  isLoading: ComputedRef<boolean>;
  isReloading: ComputedRef<boolean>;
  isEmpty: ComputedRef<boolean>;
  hasActiveFilters: ComputedRef<boolean>;
  hasError: ComputedRef<boolean>;
  refresh: () => Promise<void>;
  refreshFacets: () => Promise<void>;
  clearFilters: () => void;
  waterFromList: (plant: Plant) => Promise<void>;
};

// The home's plant collection: the search/sort/filter/pagination state, the two
// queries that back it (list + facets), the asynchronous semantic ranking, and
// the derived load/reload/empty states — everything the toolbar, filters and
// list need, kept out of the page so the page reads as orchestration only.
export const usePlantCollection = (): UsePlantCollection => {
  const { user } = useAuth();
  const { locale } = useNuxtApp().$i18n;

  const search = ref('');
  const debouncedSearch = refDebounced(search, 300);
  const sortKey = ref<PlantSortKey>('relevance');
  const genus = ref<string | null>(null);
  const hasImage = ref<boolean | null>(null);
  const petSafe = ref<boolean | null>(null);
  const page = ref(1);
  const pageSize = 12;

  // A connected GPU worker unlocks semantic (advanced) ranking — it needs the
  // worker to embed the query. Default to it when one is online, and fall back to
  // the simple relevance ranking when the worker drops.
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
  watch([debouncedSearch, sortKey, genus, hasImage, petSafe], (): void => {
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
        petSafe: petSafe.value ?? undefined,
        lang: locale.value,
        limit: pageSize,
        offset: (page.value - 1) * pageSize,
      }),
    {
      server: false,
      watch: [debouncedSearch, sortKey, genus, hasImage, petSafe, page, locale],
    },
  );

  // Semantic ranking is computed by the user's worker asynchronously (its vector
  // comes back through the job queue). While the back reports it pending, retry a
  // few times so the semantic order lands once the worker answers, without
  // hammering. Reset the budget on a new query.
  const MAX_SEMANTIC_RETRIES = 8;
  const SEMANTIC_RETRY_MS = 1200;
  const semanticRetries = ref(0);
  const semanticPending = computed((): boolean => data.value?.plants.semanticPending ?? false);
  watch([debouncedSearch, sortKey], (): void => {
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
    { server: false, watch: [debouncedSearch], default: () => ({ plantFacets: emptyFacets }) },
  );
  const facets = computed((): PlantFacets => facetsData.value?.plantFacets ?? emptyFacets);

  // Plants are private: fetch them only once the visitor is known to be authenticated.
  watch(
    user,
    (current): void => {
      if (current) {
        void refresh();
        void refreshFacets();
      }
    },
    { immediate: true },
  );

  // "Needs care first" is a client-side triage over the loaded page (overdue →
  // due today → never-watered on top); the server keeps ordering by due date so
  // the plants needing care are the ones on that page.
  const { sortByNeedsCare } = useNeedsCareSort();
  const plants = computed((): Plant[] => {
    const items = data.value?.plants.items ?? [];
    return sortKey.value === 'needsCare' ? sortByNeedsCare(items) : items;
  });
  const total = computed((): number => data.value?.plants.total ?? 0);
  const isLoading = computed((): boolean => user.value !== null && data.value === undefined);
  const isReloading = computed(
    (): boolean => status.value === 'pending' && data.value !== undefined,
  );
  const hasActiveFilters = computed(
    (): boolean =>
      debouncedSearch.value !== '' ||
      genus.value !== null ||
      hasImage.value !== null ||
      petSafe.value !== null,
  );
  // "Empty collection" (onboarding) — never during a reload: while a filter change
  // refetches, `plants` still holds the previous result, so gating on the reload
  // keeps this reflecting only a settled, genuinely empty collection.
  const isEmpty = computed(
    (): boolean => plants.value.length === 0 && !hasActiveFilters.value && !isReloading.value,
  );
  const hasError = computed((): boolean => Boolean(error.value));

  const clearFilters = (): void => {
    search.value = '';
    genus.value = null;
    hasImage.value = null;
    petSafe.value = null;
  };

  // The shared 'plants' list cache, mutated in place for optimistic watering.
  const { data: plantsCache } = useNuxtData<PlantsQuery>('plants');
  const waterPlantId = ref('');
  const { execute: runWater, error: waterError } = useMutation(() =>
    GqlWaterPlant({ input: { plantId: waterPlantId.value } }),
  );

  // Mark it watered today right away (the badge reads "watered today" from
  // lastWateredOn === today) so watering from the list feels instant.
  const markWateredToday = (
    current: PlantsQuery | undefined,
    plantId: string,
  ): PlantsQuery | undefined =>
    current === undefined
      ? current
      : {
          ...current,
          plants: {
            ...current.plants,
            items: current.plants.items.map((item) =>
              item.id === plantId ? { ...item, lastWateredOn: todayIso() } : item,
            ),
          },
        };

  const waterFromList = async (plant: Plant): Promise<void> => {
    waterPlantId.value = plant.id;
    // Optimistic: apply the change at once, roll back if the call fails.
    const ok = await useOptimisticUpdate(
      plantsCache,
      (current) => markWateredToday(current, plant.id),
      { execute: runWater, error: waterError },
    );
    if (ok) {
      // Reconcile the exact next due date computed server-side.
      await refresh();
    }
  };

  return {
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
    hasActiveFilters,
    hasError,
    refresh,
    refreshFacets,
    clearFilters,
    waterFromList,
  };
};
