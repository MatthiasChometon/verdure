import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import Empty from './Empty.vue';

describe('PlantEmpty', () => {
  it('emits add when the call-to-action button is clicked', async () => {
    const wrapper = await mountSuspended(Empty);

    await wrapper.find('button').trigger('click');

    expect(wrapper.emitted('add')).toHaveLength(1);
  });
});
