import { PlantSortField, SortDirection } from '#gql/default';

type PlantSortQuery = { sort: PlantSortField; direction: SortDirection };

const sortQueries: Record<PlantSortKey, PlantSortQuery> = {
  relevance: { sort: PlantSortField.RELEVANCE, direction: SortDirection.DESC },
  semantic: { sort: PlantSortField.SEMANTIC, direction: SortDirection.DESC },
  recent: { sort: PlantSortField.CREATED_AT, direction: SortDirection.DESC },
  oldest: { sort: PlantSortField.CREATED_AT, direction: SortDirection.ASC },
  nameAsc: { sort: PlantSortField.NAME, direction: SortDirection.ASC },
  nameDesc: { sort: PlantSortField.NAME, direction: SortDirection.DESC },
  speciesAsc: { sort: PlantSortField.SPECIES, direction: SortDirection.ASC },
  watering: { sort: PlantSortField.WATERING, direction: SortDirection.ASC },
};

export const usePlantSort = (key: PlantSortKey): PlantSortQuery => sortQueries[key];
