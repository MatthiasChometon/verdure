/* eslint-disable @typescript-eslint/explicit-function-return-type --
   The return type is the (very large) inferred useFetch AsyncData type; the
   Nuxt "Custom useFetch" recipe relies on inference here. */
import type { UseFetchOptions } from 'nuxt/app';

// The HTTP verbs our REST calls use; Nuxt's typed fetch defaults to `get` only.
type ApiMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

// Imperative by default (immediate/watch off): our REST calls are mutations
// triggered on user action, not reactive reads.
export const useApi = <DataT>(
  url: string | (() => string),
  options: UseFetchOptions<
    DataT,
    DataT,
    never[] & keyof DataT[],
    undefined,
    string,
    ApiMethod
  > = {},
) =>
  useFetch(url, {
    immediate: false,
    watch: false,
    ...options,
    $fetch: useNuxtApp().$api,
  });
