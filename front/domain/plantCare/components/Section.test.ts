import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, ref } from 'vue';
import CareSection from './Section.vue';

const state = vi.hoisted(() => ({
  hasError: { value: false },
  actionFailed: { value: false },
  isLoaded: { value: true },
}));
const { useCareSchedulesMock } = vi.hoisted(() => ({ useCareSchedulesMock: vi.fn() }));
mockNuxtImport('useCareSchedules', () => useCareSchedulesMock);

beforeEach(() => {
  const hasError = ref(false);
  const actionFailed = ref(false);
  const isLoaded = ref(true);
  state.hasError = hasError;
  state.actionFailed = actionFailed;
  state.isLoaded = isLoaded;
  useCareSchedulesMock.mockReturnValue({
    scheduleFor: (): undefined => undefined,
    isLoaded: computed(() => isLoaded.value),
    hasError: computed(() => hasError.value),
    actionFailed,
    isSaving: computed(() => false),
    refresh: vi.fn(),
    setSchedule: vi.fn(),
    logCare: vi.fn(),
    removeSchedule: vi.fn(),
  });
});

describe('PlantCareSection', () => {
  it('announces a failed load as an alert', async () => {
    state.hasError.value = true;

    const wrapper = await mountSuspended(CareSection, {
      props: { plantId: 'p1', plantName: 'Monstera' },
    });

    expect(wrapper.find('[role="alert"]').text()).toContain('Impossible de charger');
  });

  it('announces a failed action as an alert', async () => {
    state.actionFailed.value = true;

    const wrapper = await mountSuspended(CareSection, {
      props: { plantId: 'p1', plantName: 'Monstera' },
    });

    expect(wrapper.find('[role="alert"]').text()).toContain("L'action a échoué");
  });

  it('announces the loading state politely while the schedules load', async () => {
    state.isLoaded.value = false;

    const wrapper = await mountSuspended(CareSection, {
      props: { plantId: 'p1', plantName: 'Monstera' },
    });

    expect(wrapper.find('[role="status"]').exists()).toBe(true);
  });
});
