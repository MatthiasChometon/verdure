import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import DetailHistory from './DetailHistory.vue';

const events: WateringHistoryEntry[] = [
  { id: '2', wateredOn: '2024-06-01' },
  { id: '1', wateredOn: '2024-05-01' },
];

describe('PlantDetailHistory', () => {
  it('renders one dated row per watering, in the order given', async () => {
    const wrapper = await mountSuspended(DetailHistory, { props: { events } });

    const rows = wrapper.findAll('li');
    expect(rows).toHaveLength(2);
    expect(wrapper.findAll('time').map((time) => time.attributes('datetime'))).toEqual([
      '2024-06-01',
      '2024-05-01',
    ]);
  });

  it('shows an empty message when there is no watering yet', async () => {
    const wrapper = await mountSuspended(DetailHistory, { props: { events: [] } });

    expect(wrapper.find('li').exists()).toBe(false);
    expect(wrapper.find('time').exists()).toBe(false);
    expect(wrapper.text()).toContain('Aucun arrosage enregistré pour le moment.');
  });
});
