import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import DetailHero from './DetailHero.vue';

// Stub as a plain anchor keeping `to` as href and passing through aria-label,
// so link assertions work without the full router/i18n link machinery.
const global = {
  stubs: {
    NuxtLinkLocale: {
      props: ['to'],
      template: '<a :href="to"><slot /></a>',
    },
  },
};

const plant: PlantDetail = {
  id: 'abc',
  name: 'Monstera',
  species: 'Monstera deliciosa',
  description: 'By the window.',
  imageUrl: null,
  wateringIntervalSummerDays: null,
  wateringIntervalWinterDays: null,
  lastWateredOn: null,
  nextDueOn: null,
  wateringHistory: [],
};

describe('PlantDetailHero', () => {
  it('shows the plant name and species', async () => {
    const wrapper = await mountSuspended(DetailHero, {
      props: { plant, backTo: '/' },
      global,
    });

    expect(wrapper.get('h1').text()).toBe('Monstera');
    expect(wrapper.text()).toContain('Monstera deliciosa');
  });

  it('links back to the collection', async () => {
    const wrapper = await mountSuspended(DetailHero, {
      props: { plant, backTo: '/' },
      global,
    });

    const back = wrapper.get('a[aria-label="Retour à mes plantes"]');
    expect(back.attributes('href')).toBe('/');
  });

  it('emits water when the water button is pressed', async () => {
    const wrapper = await mountSuspended(DetailHero, {
      props: { plant, backTo: '/' },
      global,
    });

    await wrapper.get('button').trigger('click');

    expect(wrapper.emitted('water')).toHaveLength(1);
  });

  it('offers no calendar reminder for a plant whose watering is not tracked', async () => {
    const wrapper = await mountSuspended(DetailHero, {
      props: { plant, backTo: '/' },
      global,
    });

    expect(wrapper.text()).not.toContain('Ajouter au calendrier');
  });

  it('offers a watering calendar reminder once watering is tracked', async () => {
    const tracked: PlantDetail = {
      ...plant,
      wateringIntervalSummerDays: 5,
      wateringIntervalWinterDays: 9,
      nextDueOn: '2026-09-20',
    };

    const wrapper = await mountSuspended(DetailHero, {
      props: { plant: tracked, backTo: '/' },
      global,
    });

    expect(wrapper.text()).toContain('Ajouter au calendrier');
  });
});
