// How many of a long list to render now: the first `initial` at once (what the reader sees),
// then `step` more in each idle period, so no single task renders the whole list. A short list
// is rendered whole, at once. The count never goes down, so a card already shown stays.
export const useProgressiveCount = (
  total: () => number,
  { initial, step }: { initial: number; step: number },
): Ref<number> => {
  const count = ref(initial);
  let handle: number | undefined;

  const grow = (): void => {
    handle = undefined;
    count.value = Math.min(count.value + step, total());
    scheduleNext();
  };
  const scheduleNext = (): void => {
    if (count.value >= total() || handle !== undefined) {
      return;
    }
    handle =
      typeof requestIdleCallback === 'function'
        ? requestIdleCallback(grow, { timeout: 500 })
        : (setTimeout(grow, 50) as unknown as number);
  };

  onMounted(scheduleNext);
  watch(total, scheduleNext);
  onBeforeUnmount((): void => {
    if (handle === undefined) {
      return;
    }
    if (typeof cancelIdleCallback === 'function') {
      cancelIdleCallback(handle);
    } else {
      clearTimeout(handle);
    }
  });

  return count;
};
