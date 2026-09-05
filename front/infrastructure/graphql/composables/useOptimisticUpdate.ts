import type { Ref } from 'vue';

// A mutation as useMutation exposes it: run it, then read its reactive error.
type RunnableMutation<ErrorT> = {
  execute: () => Promise<void>;
  error: Ref<ErrorT>;
};

// No normalised GraphQL cache here (nuxt-graphql-client + useAsyncData), so
// `cache` is the ref useQuery/useNuxtData exposes for the query to touch.
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
