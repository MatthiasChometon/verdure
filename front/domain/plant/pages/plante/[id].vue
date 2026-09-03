<script setup lang="ts">
import type { PlantQuery } from '#gql';

const route = useRoute();
const localePath = useLocalePath();
const { t, locale } = useNuxtApp().$i18n;

const plantId = computed((): string => String(route.params.id));
const backTo = computed((): string => localePath('/mes-plantes'));

const { isAuthReady, isLoggedIn } = useAuth();
const isAuthDialogOpen = ref(false);

const { data, status, refresh, error } = useQuery(
  'plant-detail',
  () => GqlPlant({ id: plantId.value, lang: locale.value }),
  {
    server: false,
    watch: [plantId, locale],
  },
);

const plant = computed((): PlantDetail | null => data.value?.plant ?? null);
const isLoading = computed((): boolean => status.value === 'pending');
const hasError = computed((): boolean => Boolean(error.value));
// Loaded, allowed, but no such plant (deleted, or not the user's).
const isMissing = computed((): boolean => status.value === 'success' && plant.value === null);

// The query is lazy: fire the first load by hand (the watch only refires on a
// later id change, e.g. navigating from one plant's page to another's).
onMounted((): void => {
  void refresh();
});

useHead(
  computed(() => ({
    title: plant.value === null ? t('plant.detail.metaTitle') : plant.value.name,
  })),
);

// Optimistic watering: reuse the shared detail cache, mark it watered today at
// once, then reconcile the exact next-due date and journal from the server. The
// calendar reads its own shared caches, refreshed here so the new drop shows up.
const { data: detailCache } = useNuxtData<PlantQuery>('plant-detail');
const { execute: runWater, error: waterError } = useMutation(() =>
  GqlWaterPlant({ input: { plantId: plantId.value } }),
);

const onWater = async (): Promise<void> => {
  const today = todayIso();
  const ok = await useOptimisticUpdate(
    detailCache,
    (current) =>
      current === null ||
      current === undefined ||
      current.plant === null ||
      current.plant === undefined
        ? current
        : { ...current, plant: { ...current.plant, lastWateredOn: today } },
    { execute: runWater, error: waterError },
  );
  if (ok) {
    await Promise.all([refresh(), refreshNuxtData(['watering-events', 'watering-plants'])]);
  }
};
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <a href="#content" class="skip-link">{{ $t('accessibility.skip') }}</a>
    <PlantHeader v-model:open="isAuthDialogOpen" />
    <main id="content" class="mx-auto w-full max-w-5xl flex-1 px-6 pt-28 pb-10">
      <PlantDetailSkeleton v-if="!isAuthReady || isLoading" />

      <PlantSignInPrompt v-else-if="!isLoggedIn" @login="isAuthDialogOpen = true" />

      <div v-else-if="hasError" class="flex flex-col items-start gap-4">
        <UAlert
          color="error"
          variant="soft"
          icon="i-lucide-triangle-alert"
          :title="$t('plant.detail.error')"
          class="w-full"
        />
        <UButton color="neutral" variant="soft" icon="i-lucide-rotate-cw" @click="refresh()">
          {{ $t('plant.retry') }}
        </UButton>
      </div>

      <div v-else-if="isMissing" class="flex flex-col items-start gap-4">
        <UAlert
          color="neutral"
          variant="soft"
          icon="i-lucide-leaf-off"
          :title="$t('plant.detail.notFound')"
          :description="$t('plant.detail.notFoundHint')"
          class="w-full"
        />
        <UButton :to="backTo" color="neutral" variant="soft" icon="i-lucide-arrow-left">
          {{ $t('plant.detail.back') }}
        </UButton>
      </div>

      <div v-else-if="plant" class="flex flex-col gap-12">
        <UiAnimationReveal variant="up">
          <PlantDetailHero :plant="plant" :back-to="backTo" @water="onWater" />
        </UiAnimationReveal>

        <UiAnimationReveal v-if="plant.speciesInfo" variant="up">
          <section aria-labelledby="bio-title" class="flex flex-col gap-6">
            <h2 id="bio-title" class="text-highlighted text-lg font-semibold">
              {{ $t('plant.bio.title') }}
            </h2>
            <PlantBioCard :species-info="plant.speciesInfo" />
          </section>
        </UiAnimationReveal>

        <UiAnimationReveal variant="up">
          <section aria-labelledby="care-sheet-title" class="flex flex-col gap-6">
            <h2 id="care-sheet-title" class="text-highlighted text-lg font-semibold">
              {{ $t('plant.careSheet.title') }}
            </h2>
            <PlantCareSheetCard v-if="plant.careSheet" :care-sheet="plant.careSheet" />
            <PlantCareSection :plant-id="plant.id" />
          </section>
        </UiAnimationReveal>

        <UiAnimationReveal variant="up">
          <PlantDetailJournal :plant-id="plant.id" />
        </UiAnimationReveal>

        <UiAnimationReveal variant="up">
          <PlantDetailHistory :events="plant.wateringHistory" />
        </UiAnimationReveal>

        <UiAnimationReveal variant="up">
          <section aria-labelledby="watering-calendar-title" class="flex flex-col gap-4">
            <h2 id="watering-calendar-title" class="text-highlighted text-lg font-semibold">
              {{ $t('plant.calendar.title') }}
            </h2>
            <PlantCalendar :plant-id="plant.id" />
          </section>
        </UiAnimationReveal>
      </div>
    </main>
    <PlantFooter />
  </div>
</template>
