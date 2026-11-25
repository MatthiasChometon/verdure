import { mountSuspended } from '@nuxt/test-utils/runtime';
import { fireEvent, screen } from '@testing-library/vue';
import { afterEach, describe, expect, it } from 'vitest';
import MobileMenu from './MobileMenu.vue';

const items: HeaderNavItem[] = [
  { to: '/', icon: 'i-lucide-house', label: 'Accueil', isAi: false, active: true },
  { to: '/mes-plantes', icon: 'i-lucide-leaf', label: 'Mes plantes', isAi: false, active: false },
  {
    to: '/activate-ai',
    icon: 'i-lucide-badge-check',
    label: 'IA locale connectée',
    isAi: true,
    active: false,
  },
];

const global = {
  stubs: { NuxtLinkLocale: { props: ['to'], template: '<a :href="to"><slot /></a>' } },
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('PlantMobileMenu', () => {
  it('lists every destination it is given, with its label', async () => {
    await mountSuspended(MobileMenu, { props: { open: true, items }, global });

    expect(await screen.findByText('Accueil')).toBeTruthy();
    expect(screen.getByText('Mes plantes')).toBeTruthy();
    expect(screen.getByText('IA locale connectée')).toBeTruthy();
  });

  it('highlights only the active destination', async () => {
    await mountSuspended(MobileMenu, { props: { open: true, items }, global });

    const link = (label: string): Element | null => screen.getByText(label).closest('a');
    expect(link('Accueil')?.classList.contains('m-active')).toBe(true);
    expect(link('Mes plantes')?.classList.contains('m-active')).toBe(false);
  });

  it('closes itself when a destination is chosen', async () => {
    const wrapper = await mountSuspended(MobileMenu, { props: { open: true, items }, global });

    await fireEvent.click(await screen.findByText('Mes plantes'));

    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false]);
  });
});
