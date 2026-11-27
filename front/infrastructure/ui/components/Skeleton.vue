<script setup lang="ts">
// A loading placeholder without Nuxt UI's per-instance cost (theme proxy + class merge on every
// render: pages draw 10-30 of them). Same look as `USkeleton` with this app's `bg-accented` base;
// the default `rounded-md` only applies when the caller picks no radius, which is what the class
// merge used to decide. Purely decorative: the screen-reader label is the sibling `role=status`.
const { class: classes = '' } = defineProps<{ class?: string }>();

const hasRadius = (value: string): boolean => /(^|\s)rounded(-|\s|$)/.test(value);
</script>

<template>
  <div
    aria-hidden="true"
    :class="['animate-pulse bg-accented', hasRadius(classes) ? '' : 'rounded-md', classes]"
  />
</template>
