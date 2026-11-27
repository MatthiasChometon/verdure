<script setup lang="ts">
import type { PlainButtonSize, PlainButtonVariant } from '../utils/plainButton';
import { plainButtonClasses } from '../utils/plainButton';

// A button that looks like Nuxt UI's `UButton` (ghost/subtle neutral, solid primary) without its
// per-instance cost. It has no loading state, no link mode and no leading-icon prop: use `UButton`
// where those are needed. `type` defaults to "button"; every other attribute falls through.
const {
  variant = 'ghost',
  size = 'md',
  square = false,
  type = 'button',
} = defineProps<{
  variant?: PlainButtonVariant;
  size?: PlainButtonSize;
  square?: boolean;
  type?: 'button' | 'submit' | 'reset';
}>();
</script>

<template>
  <button :type="type" :class="plainButtonClasses(variant, size, square)">
    <slot />
  </button>
</template>
