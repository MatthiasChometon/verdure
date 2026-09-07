import type { PlantQuery } from '#gql';

// A plant's curated care sheet, as returned on the detail query. NonNullable:
// the field is nullable on the wire, but a rendered card always has a value.
export type PlantCareSheet = NonNullable<NonNullable<PlantQuery['plant']>['careSheet']>;
