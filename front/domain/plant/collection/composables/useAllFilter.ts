// Value of the "all" option of a filter Select. A Select item needs a defined
// value, so "no filter" is this constant at the Select and `undefined`
// everywhere else (filter state, query variables). Script-safe: no auto-import.
export const ALL_FILTER = 'all' as const;

export type AllFilter = typeof ALL_FILTER;
