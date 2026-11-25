<script setup lang="ts">
const { status } = defineProps<{ status: WateringStatus }>();

const { t } = useNuxtApp().$i18n;

// One literal key per level: the i18n scanner can only check static keys.
const label = computed((): string => {
  const named = { count: status.count };
  const options = { plural: status.count };
  switch (status.level) {
    case 'overdue':
      return t('plant.watering.status.overdue', named, options);
    case 'dueToday':
      return t('plant.watering.status.dueToday', named, options);
    case 'upcoming':
      return t('plant.watering.status.upcoming', named, options);
    case 'wateredToday':
      return t('plant.watering.status.wateredToday', named, options);
    case 'never':
      return t('plant.watering.status.never', named, options);
  }
});

// 🟢 up to date / watered / never · 🟡 due today · 🟠 one day late · 🔴 overdue.
const dotClass = computed((): string => {
  if (status.level === 'overdue') {
    return status.count === 1 ? 'bg-orange-500' : 'bg-red-500';
  }
  if (status.level === 'dueToday') {
    return 'bg-amber-400';
  }
  return 'bg-green-500';
});
</script>

<template>
  <span class="inline-flex items-center gap-1.5 text-xs font-medium">
    <UIcon
      v-if="status.level === 'wateredToday'"
      name="i-lucide-check"
      class="size-3.5 text-green-500"
      aria-hidden="true"
    />
    <span v-else class="size-2 shrink-0 rounded-full" :class="dotClass" aria-hidden="true" />
    <span class="text-muted">{{ label }}</span>
  </span>
</template>
