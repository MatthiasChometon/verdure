/* eslint-disable @typescript-eslint/explicit-function-return-type --
   The return type is the (large) inferred useAsyncData AsyncData type. */
import type { AsyncDataOptions } from 'nuxt/app';

// A lazy GraphQL write: run on demand, read status/error from useAsyncData (never
// hand-roll it, never try/catch a Gql call). Lazy defaults like useQuery.
export const useMutation = <DataT>(
  handler: () => Promise<DataT>,
  options: AsyncDataOptions<DataT> = {},
) =>
  // useId() key, not the build-time auto-key: all mutations share this one call
  // site, so a shared key would share their status/error — useId() keeps them apart.
  useAsyncData<DataT>(useId(), handler, {
    immediate: false,
    watch: [],
    ...options,
  });
