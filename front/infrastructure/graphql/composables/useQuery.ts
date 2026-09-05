/* eslint-disable @typescript-eslint/explicit-function-return-type --
   The return type is the (large) inferred useAsyncData AsyncData type. */
import type { AsyncDataOptions } from 'nuxt/app';

// The default value keeps the query's own data shape (not undefined).
type QueryOptions<DataT> = Omit<AsyncDataOptions<DataT>, 'default'> & {
  default?: () => DataT;
};

// Lazy by default, like useApi; pass immediate/watch to override. Note
// useAsyncData's watch is a source list, not false like useFetch — off = [].
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
