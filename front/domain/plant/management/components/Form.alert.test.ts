import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import Form from './Form.vue';
import PlantSpeciesField from './SpeciesField.vue';

const { useMutationMock } = vi.hoisted(() => ({ useMutationMock: vi.fn() }));
mockNuxtImport('useMutation', () => useMutationMock);

const global = {
  components: { PlantSpeciesField },
  stubs: {
    PlantSafetyPreview: true,
    PlantImageField: { template: '<input type="file" />' },
    WateringFields: true,
  },
};

describe('PlantForm save failure', () => {
  it('announces nothing while the save has not failed', async () => {
    useMutationMock.mockReturnValue({
      status: ref('idle'),
      error: ref(),
      execute: vi.fn(),
    });

    const wrapper = await mountSuspended(Form, { global });

    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });

  it('announces the failure as an alert', async () => {
    useMutationMock.mockReturnValue({
      status: ref('error'),
      error: ref(new Error('boom')),
      execute: vi.fn(),
    });

    const wrapper = await mountSuspended(Form, { global });

    expect(wrapper.get('[role="alert"]').text()).toContain("L'opération a échoué. Réessayez.");
  });
});
