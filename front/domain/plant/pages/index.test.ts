import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import type { Ref } from 'vue';
import Index from './index.vue';

// The home is the daily "Today" board. It leans only on useAuth to pick which of
// the three states to show (loading / signed-out / the watering band). Mock that
// seam and stub the layout + band so the test drives the page's orchestration.
const { useAuthMock } = vi.hoisted(() => ({ useAuthMock: vi.fn() }));
mockNuxtImport('useAuth', () => useAuthMock);

let isAuthReady: Ref<boolean>;
let isLoggedIn: Ref<boolean>;

beforeEach(() => {
  isAuthReady = ref(true);
  isLoggedIn = ref(true);
  useAuthMock.mockReturnValue({ isAuthReady, isLoggedIn });
});

const global = {
  stubs: {
    PlantHeader: { template: '<div />' },
    PlantFooter: { template: '<div />' },
    PlantSignInPrompt: { template: '<div data-test="sign-in" />' },
    PlantTodayWatering: { template: '<div data-test="today-band" />' },
    UiAnimationReveal: { template: '<div><slot /></div>' },
  },
};

describe('home dashboard', () => {
  it('shows a skeleton while authentication is still resolving', async () => {
    isAuthReady.value = false;

    const wrapper = await mountSuspended(Index, { global });

    expect(wrapper.find('[role="status"]').text()).toContain('Chargement');
    expect(wrapper.find('[data-test="today-band"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="sign-in"]').exists()).toBe(false);
  });

  it('prompts anonymous visitors to sign in', async () => {
    isLoggedIn.value = false;

    const wrapper = await mountSuspended(Index, { global });

    expect(wrapper.find('[data-test="sign-in"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="today-band"]').exists()).toBe(false);
  });

  it('shows the "today" board with its watering band once signed in', async () => {
    const wrapper = await mountSuspended(Index, { global });

    expect(wrapper.find('[data-test="today-band"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("Aujourd'hui");
  });
});
