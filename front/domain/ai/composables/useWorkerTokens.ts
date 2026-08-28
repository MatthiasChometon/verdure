import type { ComputedRef, Ref } from 'vue';

type UseWorkerTokens = {
  tokens: ComputedRef<WorkerToken[]>;
  anyOnline: ComputedRef<boolean>;
  revokingId: Ref<string | null>;
  revoke: (id: string) => Promise<void>;
};

// The user's paired computers (GPU workers): the list, whether any is connected,
// and revoking one. Loads once the user is known, then polls so a computer that
// finishes connecting appears without a manual refresh.
export const useWorkerTokens = (): UseWorkerTokens => {
  const { user } = useAuth();

  const { data, refresh } = useQuery('ai-worker-tokens', () => GqlWorkerTokens(), {
    server: false,
  });
  const tokens = computed((): WorkerToken[] => data.value?.workerTokens ?? []);
  const anyOnline = computed((): boolean => tokens.value.some((token) => token.online));

  let poll: ReturnType<typeof setInterval> | undefined;
  watch(
    user,
    (current): void => {
      if (current) {
        void refresh();
      }
    },
    { immediate: true },
  );
  onMounted((): void => {
    poll = setInterval((): void => {
      if (user.value) {
        void refresh();
      }
    }, 5000);
  });
  onBeforeUnmount((): void => {
    if (poll) {
      clearInterval(poll);
    }
  });

  const revokingId = ref<string | null>(null);
  const { execute: runRevoke } = useMutation(async (): Promise<void> => {
    if (revokingId.value === null) {
      return;
    }
    await GqlRevokeWorkerToken({ id: revokingId.value });
    await refresh();
  });
  const revoke = async (id: string): Promise<void> => {
    revokingId.value = id;
    await runRevoke();
    revokingId.value = null;
  };

  return { tokens, anyOnline, revokingId, revoke };
};
