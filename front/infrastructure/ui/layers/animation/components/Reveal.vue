<script setup lang="ts">
export type RevealVariant = 'up' | 'left' | 'right' | 'zoom' | 'blur' | 'flip';

const { delay = 0, variant = 'up' } = defineProps<{ delay?: number; variant?: RevealVariant }>();

const root = ref<HTMLElement | null>(null);
const visible = ref(false);
let observer: IntersectionObserver | null = null;

onMounted((): void => {
  const el = root.value;
  if (el === null) {
    return;
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    visible.value = true;
    return;
  }
  observer = new IntersectionObserver(
    (entries: IntersectionObserverEntry[]): void => {
      if (entries.some((entry: IntersectionObserverEntry): boolean => entry.isIntersecting)) {
        visible.value = true;
        observer?.disconnect();
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -10% 0px' },
  );
  observer.observe(el);
});

onBeforeUnmount((): void => {
  observer?.disconnect();
});
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
