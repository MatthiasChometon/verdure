type UseAiWorker = {
  online: Ref<boolean>;
  refresh: () => Promise<void>;
};

// The shared, real-time "is a GPU worker connected?" signal. It lives in the
// useAsyncData('ai-worker-online') cache — the one shared-state exception, the
// GraphQL client cache — so every caller reads the same value with a single
// in-flight request (dedupe: 'defer'). The app-wide poll and the focus/network
// re-checks are wired once in the worker-status client plugin; here we just read
// the value and expose an on-demand refresh.
export const useAiWorker = (): UseAiWorker => {
  const { data, error, refresh } = useQuery('ai-worker-online', () => GqlAiWorkerOnline(), {
    server: false,
    dedupe: 'defer',
    default: () => ({ aiWorkerOnline: false }),
  });

  // An unreachable back (the device itself is offline, etc.) means no usable
  // worker — treat any error as offline rather than holding the last value.
  const online = computed(
    (): boolean => !error.value && (data.value?.aiWorkerOnline ?? false),
  );

  return { online, refresh };
};
