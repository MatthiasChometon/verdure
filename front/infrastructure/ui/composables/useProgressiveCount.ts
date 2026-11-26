// How many items of a long list to render now. The first `initial` show at once; the rest
// follow `step` at a time, one macrotask apart, so no single task mounts the whole list: each
// Nuxt UI component costs a few ms at 4x, and one task of 50 ms or more counts as blocking time.
export const useProgressiveCount = (
  total: Readonly<Ref<number>>,
  { initial, step }: { initial: number; step: number },
): Readonly<Ref<number>> => {
  const shown = ref(initial);
  let timer: ReturnType<typeof setTimeout> | undefined;

  const grow = (): void => {
    timer = undefined;
    if (shown.value >= total.value) return;
    shown.value = Math.min(shown.value + step, total.value);
    timer = setTimeout(grow, 0);
  };

  onMounted((): void => {
    watch(total, (): void => void (timer ??= setTimeout(grow, 0)), { immediate: true });
  });
  onBeforeUnmount((): void => clearTimeout(timer));

  return shown;
};
