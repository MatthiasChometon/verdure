import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref } from 'vue';

const { useAuthMock, gqlPlants, gqlPlantFacets } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  gqlPlants: vi.fn(),
  gqlPlantFacets: vi.fn(),
}));
mockNuxtImport('useAuth', () => useAuthMock);
mockNuxtImport('GqlPlants', () => gqlPlants);
mockNuxtImport('GqlPlantFacets', () => gqlPlantFacets);

const Probe = defineComponent({
  setup() {
    const collection = usePlantCollection();
    return () => h('p', collection.plants.value.map((plant: Plant) => plant.name).join(','));
  },
});

const page = { plants: { items: [{ id: '1', name: 'Monstera' }], total: 1 } };

describe('usePlantCollection requests', () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue({ user: ref(undefined) });
    gqlPlants.mockReset().mockResolvedValue(page);
    gqlPlantFacets
      .mockReset()
      .mockResolvedValue({ plantFacets: { genera: [], withImage: 0, withoutImage: 0 } });
  });

  it('starts the plants and facets requests while the sign-in check is still pending', async () => {
    const wrapper = await mountSuspended(Probe);
    await flushPromises();

    // `user` is still undefined (the `me` answer has not come): both requests are already out.
    expect(gqlPlants).toHaveBeenCalledTimes(1);
    expect(gqlPlantFacets).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toBe('Monstera');
  });

  it('swallows the refusal of a signed-out visitor', async () => {
    gqlPlants.mockRejectedValue(new Error('UNAUTHENTICATED'));
    gqlPlantFacets.mockRejectedValue(new Error('UNAUTHENTICATED'));

    await expect(mountSuspended(Probe)).resolves.toBeDefined();
    await flushPromises();
  });
});
