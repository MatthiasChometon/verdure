<script setup lang="ts">
// The top of a plant's page: its photo, identity, watering state, and the one
// primary action — water it. `backTo` is a localised path to the collection.
const { plant, backTo } = defineProps<{ plant: PlantDetail; backTo: string }>();

const emit = defineEmits<{ water: [] }>();

const status = computed((): WateringStatus | null => useWateringStatus(plant));
</script>

<template>
  <div class="flex flex-col gap-6">
    <NuxtLinkLocale
      :to="backTo"
      class="text-muted hover:text-highlighted focus-visible:text-highlighted inline-flex w-fit items-center gap-1.5 text-sm font-medium transition-colors"
      :aria-label="$t('plant.detail.back')"
    >
      <UIcon name="i-lucide-arrow-left" class="size-4" aria-hidden="true" />
      {{ $t('plant.detail.back') }}
    </NuxtLinkLocale>

    <div class="flex flex-col gap-6 sm:flex-row sm:items-stretch">
      <img
        v-if="plant.imageUrl"
        :src="plant.imageUrl"
        :alt="plant.name"
        decoding="async"
        class="bg-elevated h-56 w-full rounded-2xl object-cover sm:h-64 sm:w-64"
      />
      <div
        v-else
        class="bg-primary/10 text-primary flex h-56 w-full items-center justify-center rounded-2xl sm:h-64 sm:w-64"
        aria-hidden="true"
      >
        <UIcon name="i-lucide-leaf" class="size-16" />
      </div>

      <div class="flex min-w-0 flex-1 flex-col gap-3">
        <div class="flex flex-col gap-1">
          <h1 class="text-highlighted text-3xl font-bold tracking-tight sm:text-4xl">
            {{ plant.name }}
          </h1>
          <p class="text-muted text-lg">
            <span class="text-dimmed">{{ $t('plant.speciesLabel') }} · </span>
            <span class="italic">{{ plant.species }}</span>
          </p>
        </div>

        <p v-if="plant.description" class="text-dimmed text-sm break-words">
          {{ plant.description }}
        </p>

        <div class="mt-auto flex flex-wrap items-center gap-3 pt-2">
          <PlantWateringBadge v-if="status" :status="status" />
          <UButton
            icon="i-lucide-droplet"
            color="primary"
            :aria-label="$t('plant.watering.markWatered')"
            @click="emit('water')"
          >
            {{ $t('plant.watering.water') }}
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
