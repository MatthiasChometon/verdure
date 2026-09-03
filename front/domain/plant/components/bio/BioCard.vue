<script setup lang="ts">
const { speciesInfo } = defineProps<{ speciesInfo: PlantSpeciesInfo }>();
</script>

<template>
  <div class="border-default bg-elevated/40 flex flex-col gap-5 rounded-2xl border p-5">
    <p class="text-toned leading-relaxed break-words">{{ speciesInfo.description }}</p>

    <div class="flex items-start gap-2.5 text-sm">
      <span
        class="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-full"
      >
        <UIcon name="i-lucide-globe" class="size-4" aria-hidden="true" />
      </span>
      <div class="flex min-w-0 flex-col">
        <span class="text-muted text-xs font-medium">{{ $t('plant.bio.originLabel') }}</span>
        <span class="text-highlighted font-medium break-words">{{ speciesInfo.origin }}</span>
      </div>
    </div>
  </div>
</template>
