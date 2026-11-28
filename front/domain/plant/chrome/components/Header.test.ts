import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import Header from './Header.vue';

const { useWorkerStatusToastMock, useAuthMock } = vi.hoisted(() => ({
  useWorkerStatusToastMock: vi.fn(),
  useAuthMock: vi.fn(),
}));
mockNuxtImport('useWorkerStatusToast', () => useWorkerStatusToastMock);
mockNuxtImport('useAuth', () => useAuthMock);

const global = {
  stubs: {
    AuthDialog: true,
    PlantVine: true,
    PlantMobileMenu: true,
    LazyAuthDialog: true,
    LazyPlantMobileMenu: true,
    NuxtLinkLocale: { props: ['to'], template: '<a :href="to"><slot /></a>' },
  },
};

const mountHeader = (): ReturnType<typeof mountSuspended> => {
  useWorkerStatusToastMock.mockReturnValue({ online: ref(false) });
  useAuthMock.mockReturnValue({ user: ref(), isAuthReady: ref(true) });
  return mountSuspended(Header, { props: { open: false }, global });
};

describe('PlantHeader burger button', () => {
  it('tells assistive tech the menu is collapsed, then expanded once opened', async () => {
    const wrapper = await mountHeader();
    const burger = wrapper.get('button[aria-label="Navigation principale"]');

    expect(burger.attributes('aria-expanded')).toBe('false');

    await burger.trigger('click');

    expect(burger.attributes('aria-expanded')).toBe('true');
  });
});

const signedInUser = {
  user: ref({ name: 'Ada', email: 'ada@test.dev' }),
  isAuthReady: ref(true),
  logout: vi.fn(),
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PlantHeader account menu', () => {
  it('is a plain avatar button until idle, and a click opens the menu as it mounts', async () => {
    vi.stubGlobal('requestIdleCallback', vi.fn());
    useWorkerStatusToastMock.mockReturnValue({ online: ref(false) });
    useAuthMock.mockReturnValue(signedInUser);
    const wrapper = await mountSuspended(Header, { props: { open: false }, global });
    await flushPromises();

    expect(wrapper.findComponent({ name: 'UDropdownMenu' }).exists()).toBe(false);

    await wrapper.get('button[aria-label="Mon compte"]').trigger('click');
    await flushPromises();

    const menu = wrapper.findComponent({ name: 'UDropdownMenu' });
    expect(menu.exists()).toBe(true);
    expect(menu.props('defaultOpen')).toBe(true);
  });

  it('builds the translated entries only once the avatar is reached for', async () => {
    vi.stubGlobal('requestIdleCallback', (callback: () => void): number => {
      callback();
      return 0;
    });
    useWorkerStatusToastMock.mockReturnValue({ online: ref(false) });
    useAuthMock.mockReturnValue({
      user: ref({ name: 'Ada', email: 'ada@test.dev' }),
      isAuthReady: ref(true),
      logout: vi.fn(),
    });
    const wrapper = await mountSuspended(Header, { props: { open: false }, global });
    await flushPromises();
    const menu = wrapper.findComponent({ name: 'UDropdownMenu' });

    expect(menu.props('items')).toEqual([]);

    await wrapper.get('.h-10').trigger('pointerdown');

    expect((menu.props('items') as unknown[]).length).toBeGreaterThan(2);
  });
});
