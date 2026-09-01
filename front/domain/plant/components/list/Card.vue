<script setup lang="ts">
const {
  name,
  species,
  description = null,
  imageUrl = null,
  status = null,
  safety = null,
  tabindex = -1,
} = defineProps<{
  name: string;
  species: string;
  description?: string | null;
  imageUrl?: string | null;
  status?: WateringStatus | null;
  safety?: PlantSafety | null;
  tabindex?: number;
}>();

const emit = defineEmits<{ edit: []; delete: []; water: [] }>();

// The list drives roving-tabindex focus; expose focus() so it can move here.
const root = ref<HTMLElement | null>(null);
defineExpose({ focus: (): void => root.value?.focus() });
</script>

<template>
  <article
    ref="root"
    :tabindex="tabindex"
    :aria-label="`${name} — ${species}`"
    aria-keyshortcuts="A E S"
    class="border-default/60 bg-elevated/40 group hover:border-primary/50 relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl border p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
    @dblclick="emit('edit')"
  >
    <div
      class="absolute top-3 right-3 z-10 flex gap-1.5 opacity-100 transition-opacity focus-within:opacity-100 [@media(hover:hover)]:md:opacity-0 [@media(hover:hover)]:md:group-hover:opacity-100"
      @dblclick.stop
    >
      <UButton
        icon="i-lucide-square-pen"
        size="xs"
        color="neutral"
        variant="solid"
        :aria-label="$t('plant.editLabel')"
        @click="emit('edit')"
      />
      <UButton
        icon="i-lucide-trash-2"
        size="xs"
        color="error"
        variant="solid"
        :aria-label="$t('plant.deleteLabel')"
        @click="emit('delete')"
      />
    </div>

    <!-- lazy: offscreen cards don't fetch until near the viewport; async decode
         keeps the main thread free; the muted background is the placeholder while
         it loads (the h-40 box already reserves the space, so no layout shift). -->
    <img
      v-if="imageUrl"
      :src="imageUrl"
      :alt="name"
      loading="lazy"
      decoding="async"
      class="bg-elevated h-40 w-full rounded-xl object-cover"
    />
    <div
      v-else
      class="bg-primary/10 text-primary flex h-40 w-full items-center justify-center rounded-xl"
    >
      <UIcon name="i-lucide-leaf" class="size-10" aria-hidden="true" />
    </div>

    <div class="flex min-w-0 flex-col gap-1 px-2 pb-2">
      <h2 class="text-highlighted truncate text-lg font-semibold">{{ name }}</h2>
      <p class="text-muted truncate text-sm">
        <span class="text-dimmed">{{ $t('plant.speciesLabel') }} · </span>
        <span class="italic">{{ species }}</span>
      </p>
      <p v-if="description" class="text-dimmed mt-1 line-clamp-2 text-sm break-words">
        {{ description }}
      </p>
      <PlantSafetyBadge v-if="safety" :safety="safety" class="mt-2" />
    </div>

    <div v-if="status" class="mt-auto flex items-center justify-between gap-2 px-2 pb-1">
      <PlantWateringBadge :status="status" />
      <UButton
        icon="i-lucide-droplet"
        size="xs"
        color="primary"
        variant="soft"
        :aria-label="$t('plant.watering.markWatered')"
        @click="emit('water')"
        @dblclick.stop
      >
        {{ $t('plant.watering.water') }}
      </UButton>
    </div>
  </article>
</template>
