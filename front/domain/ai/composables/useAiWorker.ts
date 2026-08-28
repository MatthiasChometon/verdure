// Read the shared, real-time "is a GPU worker connected?" signal. The single
// poll + the focus/network re-checks live in the worker-status client plugin, so
// every caller here just reads the same reactive value (no per-component poll)
// and can force an immediate re-check via refresh().
type UseAiWorker = {
  online: Ref<boolean>;
  refresh: () => Promise<void>;
};

export const useAiWorker = (): UseAiWorker => {
  const online = useState<boolean>('aiWorkerOnline', () => false);
  const { $refreshAiWorker } = useNuxtApp();
  // $refreshAiWorker is client-only (the plugin is .client); on the server render
  // it is absent, so fall back to a no-op — refresh only ever runs on the client.
  const refresh =
    ($refreshAiWorker as (() => Promise<void>) | undefined) ??
    (async (): Promise<void> => {});
  return { online, refresh };
};
