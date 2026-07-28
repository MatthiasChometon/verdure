<script setup lang="ts">
const { status } = defineProps<{ status: WateringStatus }>();

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
    <span class="text-muted">
      {{ $t(status.labelKey, { count: status.count }, { plural: status.count }) }}
    </span>
  </span>
</template>
