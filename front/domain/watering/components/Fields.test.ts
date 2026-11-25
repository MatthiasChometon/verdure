import { renderSuspended } from '@nuxt/test-utils/runtime';
import { fireEvent, screen } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';
import Fields from './Fields.vue';

const render = async (
  days: { summer?: number; winter?: number },
  onSummer = vi.fn(),
): Promise<void> => {
  await renderSuspended(Fields, {
    props: {
      summerDays: days.summer,
      winterDays: days.winter,
      lastWateredOn: undefined,
      'onUpdate:summerDays': onSummer,
    },
  });
};

describe('WateringFields', () => {
  it('shows the intervals and reports an edited one as a number', async () => {
    const onSummer = vi.fn();
    await render({ summer: 7, winter: 14 }, onSummer);

    const [summer] = screen.getAllByRole('spinbutton');
    expect(summer).toHaveProperty('value', '7');
    await fireEvent.update(summer as HTMLElement, '10');

    expect(onSummer).toHaveBeenCalledWith(10);
  });

  it('reports a cleared interval as absent, not as an empty string', async () => {
    const onSummer = vi.fn();
    await render({ summer: 7, winter: 14 }, onSummer);

    await fireEvent.update(screen.getAllByRole('spinbutton')[0] as HTMLElement, '');

    expect(onSummer).toHaveBeenCalledWith(undefined);
  });

  it('hides the intervals while the plant is not tracked', async () => {
    await render({});

    expect(screen.queryAllByRole('spinbutton')).toHaveLength(0);
  });
});
