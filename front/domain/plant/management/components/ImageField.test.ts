import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import ImageField from './ImageField.vue';

const { usePlantIdentificationMock, useIdentifyEngineMock, usePlantnetKeyMock } = vi.hoisted(
  () => ({
    usePlantIdentificationMock: vi.fn(),
    useIdentifyEngineMock: vi.fn(),
    usePlantnetKeyMock: vi.fn(),
  }),
);
mockNuxtImport('usePlantIdentification', () => usePlantIdentificationMock);
mockNuxtImport('useIdentifyEngine', () => useIdentifyEngineMock);
mockNuxtImport('usePlantnetKey', () => usePlantnetKeyMock);

const identification = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  busy: ref(false),
  identifyFailed: ref(false),
  identifyReason: ref<string>(),
  identifiedSpecies: ref<string>(),
  resetIdentification: vi.fn(),
  identify: vi.fn(),
  ...overrides,
});

const mountWithPhoto = async (): ReturnType<typeof mountSuspended<typeof ImageField>> =>
  mountSuspended(ImageField, {
    props: { modelValue: new File(['x'], 'plant.jpg', { type: 'image/jpeg' }) },
    global: { stubs: { NuxtLinkLocale: { template: '<a><slot /></a>' } } },
  });

beforeEach(() => {
  useIdentifyEngineMock.mockReturnValue({
    mode: ref('cloud'),
    effectiveEngine: ref('cloud'),
    modeItems: ref([]),
    aiOnline: ref(false),
    checkWorker: vi.fn(),
  });
  usePlantnetKeyMock.mockReturnValue({ open: vi.fn() });
  usePlantIdentificationMock.mockReturnValue(identification());
});

describe('PlantImageField identification feedback', () => {
  it('names the engine that will run before any result', async () => {
    const wrapper = await mountWithPhoto();

    expect(wrapper.text()).toContain('Pl@ntNet');
  });

  it('keeps its live region in the page before any failure so the message gets announced', async () => {
    const wrapper = await mountWithPhoto();

    expect(wrapper.get('[role="status"]').text()).toBe('');
  });

  it.each([
    ['quota', "Quota Pl@ntNet partagé épuisé pour aujourd'hui."],
    ['limit', 'Tu as atteint ta limite quotidienne sur la clé partagée.'],
    [
      'not-configured',
      'Identification cloud non configurée — ajoute une clé Pl@ntNet (gratuite) ou connecte ton PC.',
    ],
  ])('explains a "%s" failure and offers the personal key', async (reason, message) => {
    usePlantIdentificationMock.mockReturnValue(
      identification({ identifyFailed: ref(true), identifyReason: ref(reason) }),
    );

    const wrapper = await mountWithPhoto();

    expect(wrapper.get('[role="status"]').text()).toContain(message);
    expect(wrapper.find('[role="status"] button').exists()).toBe(true);
  });

  it('announces a plain failure without the personal-key offer', async () => {
    usePlantIdentificationMock.mockReturnValue(identification({ identifyFailed: ref(true) }));

    const wrapper = await mountWithPhoto();

    expect(wrapper.get('[role="status"]').text()).toContain('Plante non reconnue.');
    expect(wrapper.find('[role="status"] button').exists()).toBe(false);
  });
});
