import type { PlantsQuery } from '#gql';

// The pet/child toxicity of a plant, as returned on the list query. NonNullable:
// the field is nullable on the wire, but a rendered badge always has a value.
export type PlantSafety = NonNullable<PlantsQuery['plants']['items'][number]['safety']>;
