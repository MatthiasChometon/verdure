import { registerEnumType } from '@nestjs/graphql';

export enum PlantSortField {
  RELEVANCE = 'RELEVANCE',
  SEMANTIC = 'SEMANTIC',
  NAME = 'NAME',
  SPECIES = 'SPECIES',
  CREATED_AT = 'CREATED_AT',
  WATERING = 'WATERING',
}

export enum SortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

registerEnumType(PlantSortField, { name: 'PlantSortField' });
registerEnumType(SortDirection, { name: 'SortDirection' });
