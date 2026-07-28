import type { Ref } from 'vue';

// Optimistic UI: apply the expected change to a cached query result immediately
// so the UI reacts without waiting for the server, run the mutation, and roll
// back to the snapshot if it throws. Returns whether the mutation succeeded, so
// the caller can surface an error and/or reconcile with a refetch on success.
//
// The stack has no normalised GraphQL cache (nuxt-graphql-client + useAsyncData),
// so `cache` is the ref useQuery/useNuxtData exposes for the query to touch.
export const optimisticUpdate = async <T>(
  cache: Ref<T>,
  apply: (current: T) => T,
  mutate: () => Promise<unknown>,
): Promise<boolean> => {
  const snapshot = cache.value;
  cache.value = apply(snapshot);
  try {
    await mutate();
    return true;
  } catch {
    cache.value = snapshot;
    return false;
  }
};
