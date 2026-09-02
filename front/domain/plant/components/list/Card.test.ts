import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import Card from './Card.vue';

const props = {
  id: '1',
  name: 'Monstera',
  species: 'Monstera deliciosa',
};

// The card links to the plant detail with NuxtLinkLocale; stub it to a plain
// anchor so these behaviour tests don't need the full router/i18n link machinery.
const global = {
  stubs: { NuxtLinkLocale: { template: '<a><slot /></a>' } },
};

describe('PlantCard watering badge', () => {
  it('shows the overdue watering badge on a late plant', async () => {
    const wrapper = await mountSuspended(Card, {
      props: {
        ...props,
        status: { level: 'overdue', labelKey: 'plant.watering.status.overdue', count: 3 },
      },
      global,
    });

    expect(wrapper.text()).toContain('À arroser depuis 3 jours');
  });

  it('shows no watering badge for an untracked plant', async () => {
    const wrapper = await mountSuspended(Card, {
      props: { ...props, status: null },
      global,
    });

    expect(wrapper.text()).not.toContain('À arroser');
  });
});

describe('PlantCard winter rest', () => {
  it('shows the winter-rest cue when the plant is dormant', async () => {
    const wrapper = await mountSuspended(Card, {
      props: { ...props, winterRest: true },
      global,
    });

    expect(wrapper.text()).toContain('hiver ralenti');
  });

  it('hides the winter-rest cue outside dormancy', async () => {
    const wrapper = await mountSuspended(Card, {
      props: { ...props, winterRest: false },
      global,
    });

    expect(wrapper.text()).not.toContain('hiver ralenti');
  });
});
