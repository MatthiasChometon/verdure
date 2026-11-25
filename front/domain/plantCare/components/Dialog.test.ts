import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import CareDialog from './Dialog.vue';

describe('PlantCareDialog', () => {
  it('is titled with the care type it configures and submits the interval', async () => {
    const wrapper = await mountSuspended(CareDialog, {
      props: { open: true, title: 'Engrais', initialInterval: 21 },
      attachTo: document.body,
    });

    expect(document.body.textContent).toContain('Engrais');

    await wrapper.vm.$nextTick();
    document.body.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('submit')?.[0]).toEqual([21]);
  });
});
