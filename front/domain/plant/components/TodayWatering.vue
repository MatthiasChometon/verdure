<script setup lang="ts">
// The action-first band at the top of the home: the plants that need watering
// today (or are overdue), each one tap away from "done". It only shows when
// there is something to do — an empty band would just be noise.
const emit = defineEmits<{ watered: [] }>();

const { data, refresh } = useQuery('plants-due', () => GqlPlantsDue(), {
  server: false,
});

// Hide a watered plant instantly (optimistic); the parent's refresh reconciles.
const hidden = ref(new Set<string>());
const due = computed(() =>
  (data.value?.plantsDue ?? []).filter((plant) => !hidden.value.has(plant.id)),
);

const wateringId = ref<string | null>(null);
const water = async (id: string): Promise<void> => {
  wateringId.value = id;
  hidden.value = new Set(hidden.value).add(id);
  try {
    await GqlWaterPlant({ input: { plantId: id } });
    emit('watered');
  } catch {
    // Put it back if it didn't take.
    const next = new Set(hidden.value);
    next.delete(id);
    hidden.value = next;
  } finally {
    wateringId.value = null;
  }
};

// The parent refreshes the band when the collection changes elsewhere (a save,
// a delete, a watering from the main list).
const reload = async (): Promise<void> => {
  hidden.value = new Set();
  await refresh();
};
defineExpose({ reload });
</script>

<template>
  <section
    v-if="due.length > 0"
    class="border-default/60 bg-elevated/40 mb-8 rounded-2xl border p-4 sm:p-5"
  >
    <h2 class="text-highlighted mb-3 flex items-center gap-2 text-sm font-semibold">
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
        <div
          v-else
          class="bg-primary/10 text-primary flex h-20 w-full items-center justify-center"
        >
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
