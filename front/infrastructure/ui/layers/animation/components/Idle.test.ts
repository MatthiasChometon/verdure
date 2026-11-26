import { mountSuspended } from '@nuxt/test-utils/runtime';
import { waitFor } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';
import Idle from './Idle.vue';

describe('UiAnimationIdle', () => {
  it('reserves its space first, then renders its content in an idle period', async () => {
    const wrapper = await mountSuspended(Idle, {
      props: { minHeight: '10rem' },
      slots: { default: '<p>content</p>' },
    });

    expect(wrapper.text()).toBe('');
    expect(wrapper.attributes('style')).toContain('min-height: 10rem');
    await waitFor(() => expect(wrapper.text()).toBe('content'), { timeout: 2000 });
    expect(wrapper.attributes('style') ?? '').not.toContain('min-height');
  });

  it('serves several blocks one after the other, in the order they asked', async () => {
    const order: string[] = [];
    const { useIdleTurn } = await import('../composables/useIdleTurn');
    const { request } = useIdleTurn();
    request((): void => void order.push('first'));
    request((): void => void order.push('second'));

    await waitFor(() => expect(order).toEqual(['first', 'second']), { timeout: 2000 });
  });
});
