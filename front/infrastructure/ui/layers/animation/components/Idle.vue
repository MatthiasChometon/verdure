<script setup lang="ts">
// Renders its content in an idle period after the page is up, one block per period, so a page
// of several sections is not rendered in one long task. It reserves `minHeight` meanwhile, close
// to the real height, so the page below does not move when the content arrives.
// `now` renders at once, for the blocks that are on screen at load.
const { minHeight = '12rem', now = false } = defineProps<{ minHeight?: string; now?: boolean }>();

const ready = ref(now);
let cancel: (() => void) | undefined;

onMounted((): void => {
  if (ready.value) {
    return;
  }
  cancel = useIdleTurn().request((): void => {
    ready.value = true;
  });
});
onBeforeUnmount((): void => cancel?.());
</script>

<template>
  <div :style="ready ? undefined : { minHeight }">
    <slot v-if="ready" />
  </div>
</template>
