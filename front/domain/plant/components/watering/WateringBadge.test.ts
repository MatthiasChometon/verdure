import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import WateringBadge from './WateringBadge.vue';

describe('PlantWateringBadge', () => {
  it('labels an overdue plant with the number of days late', async () => {
    const wrapper = await mountSuspended(WateringBadge, {
      props: {
        status: { level: 'overdue', labelKey: 'plant.watering.status.overdue', count: 3 },
      },
    });

    expect(wrapper.text()).toContain('À arroser depuis 3 jours');
  });

  it('labels a plant that is due today', async () => {
    const wrapper = await mountSuspended(WateringBadge, {
      props: {
        status: { level: 'dueToday', labelKey: 'plant.watering.status.dueToday', count: 0 },
      },
    });

    expect(wrapper.text()).toContain("À arroser aujourd'hui");
  });

  it('never conveys the state by colour alone: the dot is decorative', async () => {
    const wrapper = await mountSuspended(WateringBadge, {
      props: {
        status: { level: 'overdue', labelKey: 'plant.watering.status.overdue', count: 1 },
      },
    });

    expect(wrapper.find('[aria-hidden="true"]').exists()).toBe(true);
  });
});
