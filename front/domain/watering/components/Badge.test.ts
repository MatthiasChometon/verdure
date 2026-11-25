import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import WateringBadge from './Badge.vue';

describe('WateringBadge', () => {
  it('labels an overdue plant with the number of days late', async () => {
    const wrapper = await mountSuspended(WateringBadge, {
      props: {
        status: { level: 'overdue', count: 3 },
      },
    });

    expect(wrapper.text()).toContain('À arroser depuis 3 jours');
  });

  it('labels a plant that is due today', async () => {
    const wrapper = await mountSuspended(WateringBadge, {
      props: {
        status: { level: 'dueToday', count: 0 },
      },
    });

    expect(wrapper.text()).toContain("À arroser aujourd'hui");
  });

  it.each([
    ['upcoming', 4, 'prochain dans 4 jours'],
    ['wateredToday', 0, "Arrosé aujourd'hui"],
    ['never', 0, 'Jamais arrosé'],
  ] as const)('labels the %s level', async (level, count, text) => {
    const wrapper = await mountSuspended(WateringBadge, { props: { status: { level, count } } });

    expect(wrapper.text()).toContain(text);
  });

  it('never conveys the state by colour alone: the dot is decorative', async () => {
    const wrapper = await mountSuspended(WateringBadge, {
      props: {
        status: { level: 'overdue', count: 1 },
      },
    });

    expect(wrapper.find('[aria-hidden="true"]').exists()).toBe(true);
  });
});
