import type { PendingPairingQuery } from '#gql';

type PairingOutcome = 'approved' | 'denied';
type PairingRequest = NonNullable<PendingPairingQuery['pendingPairing']>;
type QueryStatus = 'idle' | 'pending' | 'success' | 'error';

type UsePairing = {
  code: ComputedRef<string>;
  device: ComputedRef<PairingRequest | undefined>;
  queryStatus: Ref<QueryStatus>;
  outcome: Ref<PairingOutcome | undefined>;
  approving: ComputedRef<boolean>;
  approveError: Ref<unknown>;
  denyError: Ref<unknown>;
  approve: () => Promise<void>;
  deny: () => Promise<void>;
  retryLookup: () => Promise<void>;
};

export const usePairing = (): UsePairing => {
  const route = useRoute();
  // `?code=a&code=b` is an array and `?code` alone is null: only a single string counts.
  const code = computed((): string =>
    typeof route.query.code === 'string' ? route.query.code : '',
  );
  const { user } = useAuth();
  const outcome = ref<PairingOutcome | undefined>();

  const {
    data,
    status: queryStatus,
    refresh,
  } = useQuery('pending-pairing', () => GqlPendingPairing({ code: code.value }), {
    server: false,
    immediate: false,
  });
  // GraphQL boundary: an unknown code comes back as null.
  const device = computed(
    (): PairingRequest | undefined => data.value?.pendingPairing ?? undefined,
  );

  const lookUpDeviceOncePairingIsReady = (): void => {
    watch(
      [user, code],
      async ([currentUser, currentCode]): Promise<void> => {
        if (currentUser && currentCode) {
          await refresh();
        }
      },
      { immediate: true },
    );
  };

  const {
    status: approveStatus,
    error: approveError,
    execute: approve,
  } = useMutation(async (): Promise<void> => {
    const { approvePairing } = await GqlApprovePairing({ code: code.value });
    outcome.value = approvePairing ? 'approved' : 'denied';
  });
  const approving = computed((): boolean => approveStatus.value === 'pending');

  const { error: denyError, execute: deny } = useMutation(async (): Promise<void> => {
    await GqlDenyPairing({ code: code.value });
    outcome.value = 'denied';
  });

  const retryLookup = (): Promise<void> => refresh();

  lookUpDeviceOncePairingIsReady();

  return {
    code,
    device,
    queryStatus,
    outcome,
    approving,
    approveError,
    denyError,
    approve,
    deny,
    retryLookup,
  };
};
