import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import NoResults from './NoResults.vue';

describe('PlantNoResults', () => {
  it('emits clear when the clear button is clicked', async () => {
    const wrapper = await mountSuspended(NoResults);

    await wrapper.find('button').trigger('click');

    expect(wrapper.emitted('clear')).toHaveLength(1);
  });
});
