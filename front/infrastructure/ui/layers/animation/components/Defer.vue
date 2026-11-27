<script lang="ts">
// Blocks that come into view together (the whole first screen of a page) render one per task, not
// all in the same one: a long task counts as blocking time for the part past 50 ms, so the work is
// cut into slices small enough to stay under it.
const queue: (() => void)[] = [];
const drain = (): void => {
  queue.shift()?.();
  if (queue.length > 0) setTimeout(drain, 0);
};
const enqueue = (render: () => void): void => {
  queue.push(render);
  if (queue.length === 1) setTimeout(drain, 0);
};
</script>

<script setup lang="ts">
// Renders its content only once it is about to scroll into view. A block far below the fold
// is then neither rendered nor hydrated at load, and whatever it fetches waits for the same
// moment. It reserves `minHeight` meanwhile; below the fold, so nothing visible shifts.
// `now` renders at once, for the blocks that are on screen at load.
const { minHeight = '12rem', now = false } = defineProps<{ minHeight?: string; now?: boolean }>();

const root = useTemplateRef<HTMLElement>('root');
const ready = ref(now);
let observer: IntersectionObserver | null = null;

onMounted((): void => {
  const el = root.value;
  if (ready.value || el === null) {
    return;
  }
  observer = new IntersectionObserver(
    (entries: IntersectionObserverEntry[]): void => {
      if (entries.some((entry: IntersectionObserverEntry): boolean => entry.isIntersecting)) {
        observer?.disconnect();
        enqueue((): void => {
          ready.value = true;
        });
      }
    },
    { rootMargin: '300px 0px' },
  );
  observer.observe(el);
});
onBeforeUnmount((): void => observer?.disconnect());
</script>

<template>
  <div ref="root" :style="ready ? undefined : { minHeight }">
    <slot v-if="ready" />
  </div>
</template>
