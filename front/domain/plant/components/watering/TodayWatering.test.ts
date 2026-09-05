import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import type { Ref } from 'vue';
import TodayWatering from './TodayWatering.vue';

type DuePlant = {
  id: string;
  name: string;
  species: string;
  imageUrl: string | null;
  nextDueOn: string | null;
};
type DueData = { plantsDue: DuePlant[] };

// Mock the graphql query/mutation seams and drive the reactive data ref
// directly — the real useOptimisticUpdate then filters it, as in the app.
const { useQueryMock, useMutationMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  useMutationMock: vi.fn(),
}));
mockNuxtImport('useQuery', () => useQueryMock);
mockNuxtImport('useMutation', () => useMutationMock);

let data: Ref<DueData | undefined>;
let status: Ref<string>;
let execute: ReturnType<typeof vi.fn>;
let error: Ref<Error | undefined>;

beforeEach(() => {
  data = ref<DueData | undefined>(undefined);
  status = ref('success');
  execute = vi.fn().mockResolvedValue(undefined);
  error = ref<Error | undefined>(undefined);
  useQueryMock.mockReturnValue({ data, status, refresh: vi.fn().mockResolvedValue(undefined) });
  useMutationMock.mockReturnValue({ execute, error });
});

const monstera: DuePlant = {
  id: '1',
  name: 'Monstera',
  species: 'Monstera deliciosa',
  imageUrl: null,
  nextDueOn: '2026-09-01',
};
const aloe: DuePlant = {
  id: '2',
  name: 'Aloe',
  species: 'Aloe vera',
  imageUrl: null,
  nextDueOn: '2026-09-01',
};

describe('PlantTodayWatering', () => {
  it('renders one card per plant due today', async () => {
    data.value = { plantsDue: [monstera, aloe] };

    const wrapper = await mountSuspended(TodayWatering);
    await nextTick();

    expect(wrapper.findAll('li')).toHaveLength(2);
    expect(wrapper.text()).toContain('Monstera');
    expect(wrapper.text()).toContain('Aloe');
  });

  it('waters a plant on click: runs the mutation and drops it from the band optimistically', async () => {
    data.value = { plantsDue: [monstera, aloe] };

    const wrapper = await mountSuspended(TodayWatering);
    await nextTick();

    await wrapper.findAll('li')[0]?.find('button').trigger('click');
    await flushPromises();
    await nextTick();

    expect(execute).toHaveBeenCalledTimes(1);
    expect(wrapper.findAll('li')).toHaveLength(1);
    expect(wrapper.text()).not.toContain('Monstera');
    expect(wrapper.text()).toContain('Aloe');
    expect(wrapper.emitted('watered')).toHaveLength(1);
  });

  it('rolls back the removal and does not emit when the mutation fails', async () => {
    data.value = { plantsDue: [monstera, aloe] };
    error.value = new Error('network');

    const wrapper = await mountSuspended(TodayWatering);
    await nextTick();

    await wrapper.findAll('li')[0]?.find('button').trigger('click');
    await flushPromises();
    await nextTick();

    expect(wrapper.findAll('li')).toHaveLength(2);
    expect(wrapper.text()).toContain('Monstera');
    expect(wrapper.emitted('watered')).toBeUndefined();
  });

  it('shows a calm empty state (no cards) when nothing is due', async () => {
    data.value = { plantsDue: [] };
    status.value = 'success';

    const wrapper = await mountSuspended(TodayWatering);
    await nextTick();

    expect(wrapper.findAll('li')).toHaveLength(0);
    expect(wrapper.find('section').exists()).toBe(true);
  });
});
