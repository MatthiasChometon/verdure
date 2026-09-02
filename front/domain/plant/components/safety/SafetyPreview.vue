<script setup lang="ts">
// Toxicity preview shown under the species field in the add/save form. It mirrors
// the badge from the list, plus the note as plain text (a form has room to explain
// rather than hide the reason in a tooltip). A skeleton holds the place while the
// advice loads, so the layout never jumps.
const { safety = null, pending = false } = defineProps<{
  safety?: PlantSafety | null;
  pending?: boolean;
}>();
</script>

<template>
  <div v-if="pending" class="flex flex-col gap-1.5">
    <USkeleton class="h-5 w-32 rounded-full" />
    <USkeleton class="h-3 w-full max-w-xs" />
    <span class="sr-only" role="status">{{ $t('plant.safety.loading') }}</span>
  </div>
  <div v-else-if="safety" class="flex flex-col gap-1.5">
    <PlantSafetyBadge :safety="safety" />
    <p v-if="safety.note" class="text-dimmed text-xs">{{ safety.note }}</p>
  </div>
</template>
