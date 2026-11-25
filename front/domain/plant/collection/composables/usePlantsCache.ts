import type { PlantsQuery } from '#gql';
import type { Ref } from 'vue';

type UsePlantsCache = {
  // The `useQuery` key of the collection list — one source for the query and for
  // every optimistic update that touches its cache.
  key: string;
  cache: Ref<PlantsQuery | undefined>;
  withoutPlant: (current: PlantsQuery | undefined, plantId: string) => PlantsQuery | undefined;
  withPlantWateredToday: (
    current: PlantsQuery | undefined,
    plantId: string,
  ) => PlantsQuery | undefined;
};

// The shared list cache (nuxt-graphql-client has no normalised cache): the page
// query, the delete dialog and the quick-water button all edit this one shape.
export const usePlantsCache = (): UsePlantsCache => {
  const key = 'plants';
  const { data: cache } = useNuxtData<PlantsQuery>(key);

  const mapItems = (
    current: PlantsQuery | undefined,
    transform: (items: Plant[]) => Plant[],
    totalDelta = 0,
  ): PlantsQuery | undefined =>
    current === undefined
      ? current
      : {
          ...current,
          plants: {
            ...current.plants,
            items: transform(current.plants.items),
            total: Math.max(0, current.plants.total + totalDelta),
          },
        };

  const withoutPlant = (
    current: PlantsQuery | undefined,
    plantId: string,
  ): PlantsQuery | undefined =>
    mapItems(current, (items): Plant[] => items.filter((item): boolean => item.id !== plantId), -1);

  // The badge reads "watered today" from lastWateredOn === today, so the row
  // updates at once; the exact next due date is reconciled from the server.
  const withPlantWateredToday = (
    current: PlantsQuery | undefined,
    plantId: string,
  ): PlantsQuery | undefined =>
    mapItems(current, (items): Plant[] =>
      items.map((item): Plant =>
        item.id === plantId ? { ...item, lastWateredOn: todayIso() } : item,
      ),
    );

  return { key, cache, withoutPlant, withPlantWateredToday };
};
