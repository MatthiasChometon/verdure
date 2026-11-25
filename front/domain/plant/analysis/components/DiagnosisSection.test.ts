import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import DiagnosisSection from './DiagnosisSection.vue';

const { useAiWorkerMock, usePlantDiagnosisMock } = vi.hoisted(() => ({
  useAiWorkerMock: vi.fn(),
  usePlantDiagnosisMock: vi.fn(),
}));
mockNuxtImport('useAiWorker', () => useAiWorkerMock);
mockNuxtImport('usePlantDiagnosis', () => usePlantDiagnosisMock);

const global = {
  stubs: {
    NuxtLinkLocale: {
      props: ['to'],
      template: '<a :href="to"><slot /></a>',
    },
  },
};

const diagnosisState = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  busy: ref(false),
  failed: ref(false),
  offline: ref(false),
  diagnosis: ref<string>(),
  reset: vi.fn(),
  diagnose: vi.fn(),
  ...overrides,
});

beforeEach(() => {
  useAiWorkerMock.mockReturnValue({ online: ref(true), refresh: vi.fn() });
  usePlantDiagnosisMock.mockReturnValue(diagnosisState());
});

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

  it('announces, as an alert, that no AI computer is connected', async () => {
    usePlantDiagnosisMock.mockReturnValue(diagnosisState({ offline: ref(true) }));

    const wrapper = await mountSuspended(DiagnosisSection, {
      props: { plantId: 'abc', hasImage: true },
      global,
    });

    expect(wrapper.get('[role="alert"]').text()).toContain('Aucun ordinateur IA connecté');
  });

  it('announces, as an alert, that the diagnosis failed', async () => {
    usePlantDiagnosisMock.mockReturnValue(diagnosisState({ failed: ref(true) }));

    const wrapper = await mountSuspended(DiagnosisSection, {
      props: { plantId: 'abc', hasImage: true },
      global,
    });

    expect(wrapper.get('[role="alert"]').text()).toContain('Le diagnostic a échoué.');
  });

  it('shows the diagnosis text and offers to run it again once there is a result', async () => {
    usePlantDiagnosisMock.mockReturnValue(
      diagnosisState({ diagnosis: ref('Feuilles jaunes : trop d’eau.') }),
    );

    const wrapper = await mountSuspended(DiagnosisSection, {
      props: { plantId: 'abc', hasImage: true },
      global,
    });

    expect(wrapper.text()).toContain('Feuilles jaunes : trop d’eau.');
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });
});
