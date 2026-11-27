import { mountSuspended } from '@nuxt/test-utils/runtime';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Defer from './Defer.vue';

type Callback = (entries: { isIntersecting: boolean }[]) => void;

let callbacks: Callback[] = [];

beforeEach(() => {
  callbacks = [];
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: Callback) {
        callbacks.push(callback);
      }
      observe = vi.fn();
      disconnect = vi.fn();
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('UiAnimationDefer', () => {
  it('reserves its space and renders nothing until it nears the viewport', async () => {
    const wrapper = await mountSuspended(Defer, {
      props: { minHeight: '10rem' },
      slots: { default: '<p>content</p>' },
    });

    expect(wrapper.text()).toBe('');
    expect(wrapper.attributes('style')).toContain('min-height: 10rem');

    callbacks[0]?.([{ isIntersecting: true }]);
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toBe('content');
    expect(wrapper.attributes('style') ?? '').not.toContain('min-height');
  });

  it('renders at once with `now`, without observing', async () => {
    const wrapper = await mountSuspended(Defer, {
      props: { now: true },
      slots: { default: '<p>content</p>' },
    });

    expect(wrapper.text()).toBe('content');
    expect(callbacks).toHaveLength(0);
  });
});
