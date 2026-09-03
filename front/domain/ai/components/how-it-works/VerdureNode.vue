<script setup lang="ts">
const { x, y } = defineProps<{ x: number; y: number }>();
</script>

<template>
  <g :transform="`translate(${x},${y})`">
    <rect width="24" height="24" rx="8" fill="currentColor" class="text-primary" />
    <path d="M8 17 C8 11 12 8 17 8 C17 14 13 17 8 17 Z" fill="var(--color-green-100)" />
  </g>
</template>
