import type { PlantFacetsQuery, PlantsQuery } from '#gql';

export type Plant = PlantsQuery['plants']['items'][number];

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
