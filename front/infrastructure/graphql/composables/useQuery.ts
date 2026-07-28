/* eslint-disable @typescript-eslint/explicit-function-return-type --
   The return type is the (large) inferred useAsyncData AsyncData type. */
import type { AsyncDataOptions } from 'nuxt/app';

// The default value keeps the query's own data shape (not undefined).
type QueryOptions<DataT> = Omit<AsyncDataOptions<DataT>, 'default'> & {
  default?: () => DataT;
};

// useAsyncData that stays lazy by default (no immediate run, no watched sources)
// so callers always opt in to when it runs — same philosophy as useApi. Pass
// immediate or watch to override. (useAsyncData's watch is a source list, not
// false like useFetch, so "off" is an empty array.)
export const useQuery = <DataT>(
  key: string,
  handler: () => Promise<DataT>,
  options: QueryOptions<DataT> = {},
) =>
  useAsyncData(key, handler, {
    immediate: false,
    watch: [],
    ...options,
  });
