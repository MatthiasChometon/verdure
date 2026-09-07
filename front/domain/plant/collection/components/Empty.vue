<script setup lang="ts">
const emit = defineEmits<{ add: [] }>();
</script>

<template>
  <div class="flex flex-col items-center gap-4 py-20 text-center">
    <div class="bg-primary/10 text-primary flex size-16 items-center justify-center rounded-2xl">
      <UIcon name="i-lucide-sprout" class="size-8" aria-hidden="true" />
    </div>
    <div class="flex flex-col gap-1">
      <p class="text-highlighted text-lg font-semibold">{{ $t('plant.empty') }}</p>
      <p class="text-muted text-sm">{{ $t('plant.emptyHint') }}</p>
    </div>
    <UButton icon="i-lucide-plus" @click="emit('add')">{{ $t('plant.add') }}</UButton>
  </div>
</template>
