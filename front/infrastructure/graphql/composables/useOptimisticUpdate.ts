import type { Ref } from 'vue';

// A mutation as useMutation exposes it: run it, then read its reactive error.
type RunnableMutation<ErrorT> = {
  execute: () => Promise<void>;
  error: Ref<ErrorT>;
};

// Optimistic UI: apply the expected change to a cached query result at once so
// the UI reacts without waiting for the server, run the mutation, and roll back
// to the snapshot if it reports an error. The mutation is a useMutation result,
// so its failure surfaces through the reactive `error` — this never try/catches
// a Gql* call. Returns whether it succeeded, so the caller can reconcile with a
// refresh on success (or surface the failure).
//
// The stack has no normalised GraphQL cache (nuxt-graphql-client + useAsyncData),
// so `cache` is the ref useQuery/useNuxtData exposes for the query to touch.
export const useOptimisticUpdate = async <T, ErrorT>(
  cache: Ref<T>,
  apply: (current: T) => T,
  mutation: RunnableMutation<ErrorT>,
): Promise<boolean> => {
  const snapshot = cache.value;
  cache.value = apply(snapshot);

  await mutation.execute();

  if (mutation.error.value) {
    cache.value = snapshot;
    return false;
  }
  return true;
};
