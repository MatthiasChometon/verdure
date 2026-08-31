<script setup lang="ts">
// The CSS below defines one starting transform per variant; the type mirrors it.
export type RevealVariant = 'up' | 'left' | 'right' | 'zoom' | 'blur' | 'flip';

const { delay = 0, variant = 'up' } = defineProps<{ delay?: number; variant?: RevealVariant }>();

// How it reveals lives in the CSS; when it reveals lives in this composable.
const { root, visible } = useReveal();
</script>

<template>
  <div
    ref="root"
    class="reveal"
    :class="[`reveal-${variant}`, { 'reveal-visible': visible }]"
    :style="{ transitionDelay: `${delay}ms` }"
  >
    <slot />
  </div>
</template>

<style scoped>
.reveal {
  opacity: 0;
  transition:
    opacity 0.9s ease,
    transform 1s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform, opacity;
}

.reveal-up {
  transform: translateY(48px) rotate(1.5deg);
}

.reveal-left {
  transform: translateX(-64px) skewX(3deg);
}

.reveal-right {
  transform: translateX(64px) skewX(-3deg);
}

.reveal-zoom {
  transform: scale(0.82) translateY(20px);
}

.reveal-blur {
  transform: scale(1.06);
}

.reveal-flip {
  transform: perspective(800px) rotateX(24deg) translateY(32px);
  transform-origin: top center;
}

.reveal-visible {
  opacity: 1;
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  .reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
</style>
