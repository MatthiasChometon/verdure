import { mountSuspended } from '@nuxt/test-utils/runtime';
import { screen } from '@testing-library/vue';
import { afterEach, describe, expect, it } from 'vitest';
import MobileMenu from './MobileMenu.vue';

const items: HeaderNavItem[] = [
  { to: '/', icon: 'i-lucide-house', label: 'Accueil', isAi: false },
  { to: '/activate-ai', icon: 'i-lucide-sparkles', label: 'Activer l’IA', isAi: true },
];

const global = {
  stubs: { NuxtLinkLocale: { props: ['to'], template: '<a :href="to"><slot /></a>' } },
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('PlantMobileMenu', () => {
  it('lists every destination of the header nav', async () => {
    await mountSuspended(MobileMenu, {
      props: { open: true, items, aiOnline: false, aiLabel: 'Activer l’IA' },
      global,
    });

    expect(await screen.findByText('Accueil')).toBeTruthy();
    expect(screen.getByText('Activer l’IA')).toBeTruthy();
  });

  it('swaps the AI destination label for the live one while the worker is online', async () => {
    await mountSuspended(MobileMenu, {
      props: { open: true, items, aiOnline: true, aiLabel: 'IA locale connectée' },
      global,
    });

    expect(await screen.findByText('IA locale connectée')).toBeTruthy();
    expect(screen.queryByText('Activer l’IA')).toBeNull();
  });
});
