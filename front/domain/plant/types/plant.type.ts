import type { PlantFacetsQuery, PlantQuery, PlantsQuery } from '#gql';

export type Plant = PlantsQuery['plants']['items'][number];

// A single plant with everything its detail page needs — a superset of the list
// Plant that also carries its watering journal.
export type PlantDetail = NonNullable<PlantQuery['plant']>;

export type WateringHistoryEntry = PlantDetail['wateringHistory'][number];

export type PlantFacets = PlantFacetsQuery['plantFacets'];

export type PlantSortKey =
  | 'relevance'
  | 'semantic'
  | 'recent'
  | 'oldest'
  | 'nameAsc'
  | 'nameDesc'
  | 'speciesAsc'
  | 'watering';
