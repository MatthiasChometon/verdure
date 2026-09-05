type UseAiWorker = {
  online: Ref<boolean>;
  refresh: () => Promise<void>;
};

// Shared live "GPU worker connected?" signal: reads the useAsyncData('ai-worker-online')
// cache (dedupe: 'defer') so every caller shares one request; polling is wired once in the worker-status plugin.
export const useAiWorker = (): UseAiWorker => {
  const { data, error, refresh } = useQuery('ai-worker-online', () => GqlAiWorkerOnline(), {
    server: false,
    dedupe: 'defer',
    default: () => ({ aiWorkerOnline: false }),
  });

  // An unreachable back (the device itself is offline, etc.) means no usable
  // worker — treat any error as offline rather than holding the last value.
  const online = computed((): boolean => !error.value && (data.value?.aiWorkerOnline ?? false));

  return { online, refresh };
};
