import type { PlantQuery } from '#gql';

// A plant's curated bio, as returned on the detail query. NonNullable: the field
// is nullable on the wire, but a rendered card always has a value.
export type PlantSpeciesInfo = NonNullable<NonNullable<PlantQuery['plant']>['speciesInfo']>;
