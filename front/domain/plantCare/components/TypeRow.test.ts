import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import { CareType } from '#gql/default';
import CareTypeRow from './TypeRow.vue';

const meta = {
  type: CareType.FERTILIZING,
  icon: 'i-lucide-flask-conical',
  defaultIntervalDays: 30,
  label: (): string => 'Engrais',
};

const schedule = {
  id: 's1',
  careType: CareType.FERTILIZING,
  intervalDays: 30,
  lastDoneOn: '2026-08-01',
  nextDueOn: '2026-08-31',
};

describe('PlantCareTypeRow', () => {
  it('offers a single action to start tracking when not configured', async () => {
    const wrapper = await mountSuspended(CareTypeRow, { props: { plantName: 'Monstera', meta } });

    const buttons = wrapper.findAll('button');
    expect(buttons).toHaveLength(1);

    await buttons[0]?.trigger('click');
    expect(wrapper.emitted('configure')?.[0]).toEqual([CareType.FERTILIZING]);
  });

  it('marks the task done, edits, and stops tracking when configured', async () => {
    const wrapper = await mountSuspended(CareTypeRow, {
      props: { plantName: 'Monstera', meta, schedule },
    });

    // Mark done · add to calendar · edit · remove, in that order.
    const buttons = wrapper.findAll('button');
    expect(buttons).toHaveLength(4);

    await buttons[0]?.trigger('click');
    expect(wrapper.emitted('done')?.[0]).toEqual([CareType.FERTILIZING]);

    await buttons[2]?.trigger('click');
    expect(wrapper.emitted('configure')?.[0]).toEqual([CareType.FERTILIZING]);

    await buttons[3]?.trigger('click');
    expect(wrapper.emitted('remove')?.[0]).toEqual([CareType.FERTILIZING]);
  });

  it('offers no calendar reminder when the schedule has no due date yet', async () => {
    const wrapper = await mountSuspended(CareTypeRow, {
      props: { plantName: 'Monstera', meta, schedule: { ...schedule, nextDueOn: null } },
    });

    expect(wrapper.findAll('button')).toHaveLength(3);
  });

  it('names the care type and shows the last-done day as written, whatever the machine zone', async () => {
    const wrapper = await mountSuspended(CareTypeRow, {
      props: { plantName: 'Monstera', meta, schedule: { ...schedule, lastDoneOn: '2026-08-01' } },
    });

    expect(wrapper.text()).toContain('Engrais');
    expect(wrapper.text()).toContain('1 août 2026');
  });

  it.each([
    ['never done', null, null, 'Jamais fait'],
    ['upcoming', '2026-08-01', '2999-01-01', 'Prochain dans'],
    ['overdue', '2026-08-01', '2000-01-01', 'En retard de'],
  ])('labels a %s routine', async (_name, lastDoneOn, nextDueOn, text) => {
    const wrapper = await mountSuspended(CareTypeRow, {
      props: { plantName: 'Monstera', meta, schedule: { ...schedule, lastDoneOn, nextDueOn } },
    });

    expect(wrapper.text()).toContain(text);
  });
});
