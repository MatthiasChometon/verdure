import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import Filters from './Filters.vue';

const facets: PlantFacets = {
  genera: [{ value: 'monstera', count: 2 }],
  withImage: 1,
  withoutImage: 1,
};

describe('PlantFilters', () => {
  it('shows the "all" option of every select while no filter is set', async () => {
    const wrapper = await mountSuspended(Filters, { props: { facets } });

    expect(wrapper.text()).toContain('Tous les genres');
    expect(wrapper.text()).toContain('Toutes les plantes');
    expect(wrapper.text()).toContain('Toxicité : toutes');
  });

  it('shows the selected genus instead of the "all" option', async () => {
    const wrapper = await mountSuspended(Filters, { props: { facets, genus: 'monstera' } });

    expect(wrapper.text()).toContain('Monstera (2)');
    expect(wrapper.text()).not.toContain('Tous les genres');
  });

  it.each([
    ['genus', 0, 'monstera'],
    ['hasImage', 1, true],
    ['petSafe', 2, true],
  ])('clears the %s filter (undefined) when "all" is chosen', async (model, index, active) => {
    const wrapper = await mountSuspended(Filters, { props: { facets, [model]: active } });

    wrapper.findAllComponents({ name: 'USelect' })[index]?.vm.$emit('update:modelValue', 'all');

    expect(wrapper.emitted(`update:${model}`)).toEqual([[undefined]]);
  });
});
