/* eslint-disable @typescript-eslint/explicit-function-return-type -- the return type
   is inferred on purpose: codegen types pendingPairing as optional, so annotating
   `device` would carry `undefined` and break the `device === null` narrowing in the
   template. Inference gives the correct `PairingRequest | null`. */
type PairingOutcome = 'approved' | 'denied' | null;

export const usePairing = () => {
  const route = useRoute();
  const code = computed((): string => String(route.query.code ?? ''));
  const { user } = useAuth();
  const outcome = ref<PairingOutcome>(null);

  const { data, status: queryStatus, refresh } = useQuery(
    'pending-pairing',
    () => GqlPendingPairing({ code: code.value }),
    { server: false, immediate: false },
  );
  const device = computed(() => data.value?.pendingPairing ?? null);

  const lookUpDeviceOncePairingIsReady = (): void => {
    watch(
      [user, code],
      ([currentUser, currentCode]): void => {
        if (currentUser && currentCode) {
          void refresh();
        }
      },
      { immediate: true },
    );
  };

  const { status: approveStatus, error: approveError, execute: approve } = useMutation(
    async (): Promise<void> => {
      const { approvePairing } = await GqlApprovePairing({ code: code.value });
      outcome.value = approvePairing ? 'approved' : 'denied';
    },
  );
  const approving = computed((): boolean => approveStatus.value === 'pending');

  const { execute: deny } = useMutation(async (): Promise<void> => {
    await GqlDenyPairing({ code: code.value });
    outcome.value = 'denied';
  });

  lookUpDeviceOncePairingIsReady();

  return { code, device, queryStatus, outcome, approving, approveError, approve, deny };
};
