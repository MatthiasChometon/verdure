/* eslint-disable @typescript-eslint/explicit-function-return-type --
   The return type is the (large) inferred useAsyncData AsyncData type. */
import type { AsyncDataOptions } from 'nuxt/app';

// A GraphQL mutation is a lazy write: run it on demand and read the outcome from
// the reactive status/error useAsyncData already exposes — never hand-roll that
// state, never try/catch a Gql* call. Same lazy defaults as useQuery (no
// immediate run, no watched sources) so the caller decides when it fires; only
// the intent differs (a write, executed once per action).
//
// The key is a per-instance useId(), not left to the build-time auto-key: that
// key is derived from the useAsyncData call site, which here is this single line,
// so every mutation would otherwise SHARE one key (and one status/error/data).
// useId() gives each call site — and each of two mutations in one component — its
// own key, SSR-stable, so a mutation's state is never shared or re-read.
export const useMutation = <DataT>(
  handler: () => Promise<DataT>,
  options: AsyncDataOptions<DataT> = {},
) =>
  useAsyncData<DataT>(useId(), handler, {
    immediate: false,
    watch: [],
    ...options,
  });
