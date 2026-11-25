import type { PlantsQuery } from '#gql';
import { describe, expect, it } from 'vitest';
import { usePlantsCache } from './usePlantsCache';

const item = (id: string, lastWateredOn?: string): PlantsQuery['plants']['items'][number] => ({
  id,
  name: `Plant ${id}`,
  species: 'Monstera deliciosa',
  winterRest: false,
  lastWateredOn,
});

const list: PlantsQuery = {
  plants: {
    items: [item('1'), item('2')],
    total: 2,
    semanticPending: false,
  },
};

describe('usePlantsCache transforms', () => {
  it('drops the removed plant and lowers the total', () => {
    const next = usePlantsCache().withoutPlant(list, '1');

    expect(next?.plants.items.map((plant) => plant.id)).toEqual(['2']);
    expect(next?.plants.total).toBe(1);
  });

  it('never lets the total go below zero', () => {
    const empty: PlantsQuery = { plants: { ...list.plants, items: [], total: 0 } };

    expect(usePlantsCache().withoutPlant(empty, '1')?.plants.total).toBe(0);
  });

  it('marks only the watered plant as watered today', () => {
    const next = usePlantsCache().withPlantWateredToday(list, '2');

    expect(next?.plants.items[0]?.lastWateredOn).toBeUndefined();
    expect(next?.plants.items[1]?.lastWateredOn).toBe(useParisDay().todayIso());
    expect(next?.plants.total).toBe(2);
  });

  it('leaves an empty cache empty', () => {
    expect(usePlantsCache().withoutPlant(undefined, '1')).toBeUndefined();
  });
});
