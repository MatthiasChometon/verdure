import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, ref } from 'vue';
import type { Ref } from 'vue';
import MesPlantes from './mes-plantes.vue';

// The list page orchestrates useAuth (which state to show) over usePlantCollection
// (the search/sort/filter/pagination + derived load/empty/error states). Mock both
// seams and stub the children so the test drives the page's branching. The keyboard
// shortcuts hook is stubbed to a no-op so no global listeners leak between tests.
const { useAuthMock, usePlantCollectionMock, usePlantShortcutsMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  usePlantCollectionMock: vi.fn(),
  usePlantShortcutsMock: vi.fn(),
}));
mockNuxtImport('useAuth', () => useAuthMock);
mockNuxtImport('usePlantCollection', () => usePlantCollectionMock);
mockNuxtImport('usePlantShortcuts', () => usePlantShortcutsMock);

let isAuthReady: Ref<boolean>;
let isLoggedIn: Ref<boolean>;

const monstera: Plant = {
  id: '1',
  name: 'Monstera',
  species: 'Monstera deliciosa',
  imageUrl: null,
  winterRest: false,
};
const aloe: Plant = {
  id: '2',
  name: 'Aloe',
  species: 'Aloe vera',
  imageUrl: null,
  winterRest: false,
};

const collection = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  search: ref(''),
  sortKey: ref('relevance'),
  genus: ref(null),
  hasImage: ref(null),
  petSafe: ref(null),
  page: ref(1),
  pageSize: 12,
  plants: computed(() => [monstera, aloe]),
  total: computed(() => 2),
  facets: computed(() => ({ genera: [], withImage: 0, withoutImage: 0 })),
  aiOnline: ref(false),
  semanticPending: computed(() => false),
  isLoading: computed(() => false),
  isReloading: computed(() => false),
  isEmpty: computed(() => false),
  hasError: computed(() => false),
  refresh: vi.fn().mockResolvedValue(undefined),
  refreshFacets: vi.fn().mockResolvedValue(undefined),
  clearFilters: vi.fn(),
  ...overrides,
});

beforeEach(() => {
  isAuthReady = ref(true);
  isLoggedIn = ref(true);
  useAuthMock.mockReturnValue({ isAuthReady, isLoggedIn });
  usePlantCollectionMock.mockReturnValue(collection());
});

const global = {
  stubs: {
    PlantHeader: { template: '<div />' },
    PlantFooter: { template: '<div />' },
    PlantSkeleton: { template: '<div data-test="skeleton" />' },
    PlantSignInPrompt: { template: '<div data-test="sign-in" />' },
    PlantToolbar: { template: '<div data-test="toolbar" />' },
    PlantFilters: { template: '<div data-test="filters" />' },
    PlantList: { template: '<ul data-test="list" />' },
    PlantEmpty: { template: '<div data-test="empty" />' },
    PlantNoResults: { template: '<div data-test="no-results" />' },
    PlantTodayWatering: { template: '<div data-test="today-band" />' },
    PlantFormDialog: { template: '<div />' },
    PlantDeleteDialog: { template: '<div />' },
    PlantShortcutsHelp: { template: '<div />' },
    UiAnimationReveal: { template: '<div><slot /></div>' },
  },
};

describe('my plants list page', () => {
  it('renders the collection (toolbar, filters, list) once signed in with plants', async () => {
    const wrapper = await mountSuspended(MesPlantes, { global });

    expect(wrapper.find('[data-test="toolbar"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="filters"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="list"]').exists()).toBe(true);
  });

  it('no longer carries the "to water today" band — that moved to the home', async () => {
    const wrapper = await mountSuspended(MesPlantes, { global });

    expect(wrapper.find('[data-test="today-band"]').exists()).toBe(false);
  });

  it('shows the onboarding empty state for a genuinely empty collection', async () => {
    usePlantCollectionMock.mockReturnValue(
      collection({
        plants: computed(() => []),
        total: computed(() => 0),
        isEmpty: computed(() => true),
      }),
    );

    const wrapper = await mountSuspended(MesPlantes, { global });

    expect(wrapper.find('[data-test="empty"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="list"]').exists()).toBe(false);
  });

  it('shows an error state with a retry when the collection fails to load', async () => {
    usePlantCollectionMock.mockReturnValue(collection({ hasError: computed(() => true) }));

    const wrapper = await mountSuspended(MesPlantes, { global });

    expect(wrapper.text()).toContain('Impossible de charger les plantes');
    expect(wrapper.text()).toContain('Réessayer');
  });

  it('prompts anonymous visitors to sign in', async () => {
    isLoggedIn.value = false;

    const wrapper = await mountSuspended(MesPlantes, { global });

    expect(wrapper.find('[data-test="sign-in"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="list"]').exists()).toBe(false);
  });
});
