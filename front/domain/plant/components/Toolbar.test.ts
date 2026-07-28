import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import Toolbar from './Toolbar.vue';

describe('PlantToolbar', () => {
  it('renders a search input', async () => {
    const wrapper = await mountSuspended(Toolbar, { props: { search: '', sort: 'recent' } });

    expect(wrapper.find('input').exists()).toBe(true);
  });

  it('emits the typed search term', async () => {
    const wrapper = await mountSuspended(Toolbar, { props: { search: '', sort: 'recent' } });

    await wrapper.find('input').setValue('monstera');

    expect(wrapper.emitted('update:search')?.at(-1)).toEqual(['monstera']);
  });
});
