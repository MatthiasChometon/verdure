// Live "is a GPU worker connected?" status, polled on the client. Shared by the
// identify field and the plant search (which switches to semantic ranking when a
// worker is online). Each caller gets its own light poll — cheap, and it stops
// on unmount.
type UseAiWorker = {
  online: Ref<boolean>;
  refresh: () => Promise<void>;
};

const POLL_INTERVAL_MS = 8000;

export const useAiWorker = (): UseAiWorker => {
  const online = ref(false);

  const refresh = async (): Promise<void> => {
    try {
      online.value = (await GqlAiWorkerOnline()).aiWorkerOnline;
    } catch {
      online.value = false;
    }
  };

  let poll: ReturnType<typeof setInterval> | undefined;
  onMounted((): void => {
    void refresh();
    poll = setInterval((): void => {
      void refresh();
    }, POLL_INTERVAL_MS);
  });
  onBeforeUnmount((): void => {
    if (poll) {
      clearInterval(poll);
    }
  });

  return { online, refresh };
};
