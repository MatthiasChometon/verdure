import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it, vi } from 'vitest';
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
