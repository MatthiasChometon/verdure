import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import Card from './Card.vue';

const props = {
  name: 'Monstera',
  species: 'Monstera deliciosa',
};

describe('PlantCard winter rest', () => {
  it('shows the winter-rest cue when the plant is dormant', async () => {
    const wrapper = await mountSuspended(Card, {
      props: { ...props, winterRest: true },
    });

    expect(wrapper.text()).toContain('hiver ralenti');
  });

  it('hides the winter-rest cue outside dormancy', async () => {
    const wrapper = await mountSuspended(Card, {
      props: { ...props, winterRest: false },
    });

    expect(wrapper.text()).not.toContain('hiver ralenti');
  });
});
