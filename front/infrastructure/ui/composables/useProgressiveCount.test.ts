import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref, type VNode } from 'vue';
import { useProgressiveCount } from './useProgressiveCount';

describe('useProgressiveCount', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the first items at once and then grows to the whole list', async () => {
    vi.useFakeTimers();
    const total = ref(10);
    let shown!: Readonly<Ref<number>>;
    mount(
      defineComponent({
        setup: (): (() => VNode) => {
          shown = useProgressiveCount(total, { initial: 4, step: 3 });
          return () => h('div');
        },
      }),
    );

    expect(shown.value).toBe(4);
    await vi.advanceTimersByTimeAsync(1);
    expect(shown.value).toBe(10);
    await vi.advanceTimersByTimeAsync(1);
    expect(shown.value).toBe(10);
  });
});
