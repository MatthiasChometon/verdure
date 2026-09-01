<script setup lang="ts">
// The action-first band at the top of the home: the plants that need watering
// today (or are overdue), each one tap away from "done". When nothing is due it
// stays as a calm "all caught up" line rather than vanishing, so the daily ritual
// always has a visible home.
import type { PlantsDueQuery } from '#gql';

const emit = defineEmits<{ watered: [] }>();

const { data, status, refresh } = useQuery('plants-due', () => GqlPlantsDue(), {
  server: false,
});
const due = computed((): PlantsDueQuery['plantsDue'] => data.value?.plantsDue ?? []);

// The query is lazy (never immediate): kick off the first fetch by hand on mount.
onMounted((): void => {
  void refresh();
});

// One of four visual states. A parent-driven reload keeps the current data in
// place while it refetches, so it never falls back to the skeleton — only the
// very first load (no data yet) shows it.
type BandMode = 'loading' | 'due' | 'empty' | 'hidden';
const mode = computed((): BandMode => {
  if (status.value === 'error') return 'hidden';
  if (due.value.length > 0) return 'due';
  if (status.value === 'success') return 'empty';
  return 'loading';
});

const wateringId = ref<string | null>(null);
const waterId = ref('');
const { execute: runWater, error: waterError } = useMutation(() =>
  GqlWaterPlant({ input: { plantId: waterId.value } }),
);

const water = async (id: string): Promise<void> => {
  wateringId.value = id;
  waterId.value = id;
  // Optimistic: drop it from the band at once; it comes back if the call fails.
  await useOptimisticUpdate(
    data,
    (current) =>
      current === undefined
        ? current
        : { ...current, plantsDue: current.plantsDue.filter((plant) => plant.id !== id) },
    { execute: runWater, error: waterError },
  );
  wateringId.value = null;
  if (!waterError.value) {
    emit('watered');
  }
};

// The parent refreshes the band when the collection changes elsewhere (a save,
// a delete, a watering from the main list).
const reload = async (): Promise<void> => {
  await refresh();
};
defineExpose({ reload });
</script>

<template>
  <section v-if="mode === 'loading'" class="mb-8">
    <div aria-hidden="true">
      <div class="mb-3 flex items-center gap-2">
        <USkeleton class="size-5 rounded" />
        <USkeleton class="h-4 w-40" />
      </div>
      <div class="-mx-1 flex gap-3 overflow-hidden px-1">
        <USkeleton v-for="n in 3" :key="n" class="h-40 w-40 shrink-0 rounded-xl" />
      </div>
    </div>
    <span class="sr-only" role="status">{{ $t('plant.today.loading') }}</span>
  </section>

  <section
    v-else-if="mode === 'empty'"
    class="border-default/60 bg-elevated/40 mb-8 flex items-center gap-2.5 rounded-2xl border px-4 py-3"
  >
    <UIcon name="i-lucide-check" class="text-primary size-5 shrink-0" aria-hidden="true" />
    <p class="text-muted text-sm">{{ $t('plant.today.empty') }}</p>
  </section>

  <section
    v-else-if="mode === 'due'"
    class="border-default/60 bg-elevated/40 mb-8 rounded-2xl border p-4 sm:p-5"
    aria-labelledby="today-band-title"
  >
    <h2
      id="today-band-title"
      class="text-highlighted mb-3 flex items-center gap-2 text-sm font-semibold"
    >
      <UIcon name="i-lucide-droplets" class="text-primary size-5 shrink-0" aria-hidden="true" />
      {{ $t('plant.today.title') }}
      <UBadge color="primary" variant="soft" size="sm">{{ due.length }}</UBadge>
    </h2>

    <ul class="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
      <li
        v-for="plant in due"
        :key="plant.id"
        class="border-default/60 bg-default flex w-40 shrink-0 flex-col overflow-hidden rounded-xl border"
      >
        <img
          v-if="plant.imageUrl"
          :src="plant.imageUrl"
          :alt="plant.name"
          loading="lazy"
          decoding="async"
          class="bg-elevated h-20 w-full object-cover"
        />
        <div v-else class="bg-primary/10 text-primary flex h-20 w-full items-center justify-center">
          <UIcon name="i-lucide-leaf" class="size-6" aria-hidden="true" />
        </div>
        <div class="flex flex-1 flex-col gap-2 p-2.5">
          <p class="text-highlighted truncate text-sm font-medium" :title="plant.name">
            {{ plant.name }}
          </p>
          <UButton
            size="xs"
            block
            icon="i-lucide-droplet"
            :loading="wateringId === plant.id"
            @click="water(plant.id)"
          >
            {{ $t('plant.today.water') }}
          </UButton>
        </div>
      </li>
    </ul>
  </section>
</template>
