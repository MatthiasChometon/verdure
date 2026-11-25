import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import PlantPage from './[id].vue';

const { useAuthMock, useQueryMock, useMutationMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useQueryMock: vi.fn(),
  useMutationMock: vi.fn(),
}));
mockNuxtImport('useAuth', () => useAuthMock);
mockNuxtImport('useQuery', () => useQueryMock);
mockNuxtImport('useMutation', () => useMutationMock);

const global = {
  stubs: {
    PlantHeader: true,
    PlantFooter: true,
    PlantDetailSkeleton: true,
    PlantSignInPrompt: true,
    PlantDetailHero: true,
    PlantDetailHistory: true,
    PlantDiagnosisSection: true,
    CareSheet: true,
    WateringCalendar: true,
  },
};

const mountWithQuery = (query: Record<string, unknown>): ReturnType<typeof mountSuspended> => {
  useAuthMock.mockReturnValue({ isAuthReady: ref(true), isLoggedIn: ref(true) });
  useMutationMock.mockReturnValue({ status: ref('idle'), error: ref(), execute: vi.fn() });
  useQueryMock.mockReturnValue({
    data: ref(),
    status: ref('idle'),
    error: ref(),
    refresh: vi.fn(),
    ...query,
  });
  return mountSuspended(PlantPage, { global });
};

describe('plant detail page load failure', () => {
  it('announces nothing while the plant loads fine', async () => {
    const wrapper = await mountWithQuery({ status: ref('pending') });

    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });

  it('announces the failure as an alert and offers to retry', async () => {
    const wrapper = await mountWithQuery({ status: ref('error'), error: ref(new Error('boom')) });

    expect(wrapper.get('[role="alert"]').text()).toContain('Impossible de charger cette plante.');
    expect(wrapper.text()).toContain('Réessayer');
  });
});
