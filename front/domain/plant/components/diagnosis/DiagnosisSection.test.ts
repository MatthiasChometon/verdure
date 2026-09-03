import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import DiagnosisSection from './DiagnosisSection.vue';

const global = {
  stubs: {
    NuxtLinkLocale: {
      props: ['to'],
      template: '<a :href="to"><slot /></a>',
    },
  },
};

describe('PlantDiagnosisSection', () => {
  it('offers to run a diagnosis when the plant has a photo', async () => {
    const wrapper = await mountSuspended(DiagnosisSection, {
      props: { plantId: 'abc', hasImage: true },
      global,
    });

    expect(wrapper.get('button').text()).toContain('Diagnostiquer la santé');
  });

  it('asks for a photo instead of a button when the plant has none', async () => {
    const wrapper = await mountSuspended(DiagnosisSection, {
      props: { plantId: 'abc', hasImage: false },
      global,
    });

    expect(wrapper.find('button').exists()).toBe(false);
    expect(wrapper.text()).toContain('Aucune photo à analyser');
  });
});
