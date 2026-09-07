<script setup lang="ts">
const emit = defineEmits<{ clear: [] }>();
</script>

<template>
  <div class="flex flex-col items-center gap-4 py-16 text-center">
    <div class="bg-elevated text-muted flex size-14 items-center justify-center rounded-2xl">
      <UIcon name="i-lucide-search-x" class="size-7" aria-hidden="true" />
    </div>
    <div class="flex flex-col gap-1">
      <p class="text-highlighted text-lg font-semibold">{{ $t('plant.noResults') }}</p>
      <p class="text-muted text-sm">{{ $t('plant.noResultsHint') }}</p>
    </div>
    <UButton color="neutral" variant="soft" icon="i-lucide-x" @click="emit('clear')">
      {{ $t('plant.clearSearch') }}
    </UButton>
  </div>
</template>
