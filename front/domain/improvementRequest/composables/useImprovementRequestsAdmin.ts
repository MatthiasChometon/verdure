import type { ComputedRef } from 'vue';
import type { ImprovementRequestsQuery } from '#gql';
import { ImprovementStatus } from '#gql/default';

type Request = ImprovementRequestsQuery['improvementRequests'][number];

type UseImprovementRequestsAdmin = {
  requests: ComputedRef<Request[]>;
  hasError: ComputedRef<boolean>;
  isLoading: ComputedRef<boolean>;
  actionFailed: ComputedRef<boolean>;
  reload: () => Promise<void>;
  setStatus: (id: string, status: ImprovementStatus) => Promise<void>;
};

// The admin improvement-requests inbox: the requests (admins only) and the one
// moderation action — setting a request's status — reconciling the list after.
export const useImprovementRequestsAdmin = (): UseImprovementRequestsAdmin => {
  const { isAdmin } = useAdmin();

  // No try/catch: useAsyncData captures failures into `error` while `default` keeps
  // `data` a list either way — swallowing errors would hide a failure silently.
  const { data, error, status, refresh } = useAsyncData(
    'improvement:requests',
    async (): Promise<Request[]> => {
      if (!isAdmin.value) {
        return [];
      }
      const result = await GqlImprovementRequests();
      return result.improvementRequests;
    },
    { server: false, watch: [isAdmin], default: (): Request[] => [] },
  );
  const requests = computed((): Request[] => data.value ?? []);
  const hasError = computed((): boolean => Boolean(error.value));
  const isLoading = computed((): boolean => status.value === 'pending' || status.value === 'idle');

  const statusId = ref('');
  const statusValue = ref<ImprovementStatus>(ImprovementStatus.NEW);
  const { execute: runSetStatus, error: setStatusError } = useMutation(() =>
    GqlSetImprovementStatus({ input: { id: statusId.value, status: statusValue.value } }),
  );
  const setStatus = async (id: string, status: ImprovementStatus): Promise<void> => {
    statusId.value = id;
    statusValue.value = status;
    await runSetStatus();
    if (!setStatusError.value) {
      await refresh();
    }
  };

  // A moderation click that failed must not look like it worked: the list would just
  // stay as it was.
  const actionFailed = computed((): boolean => Boolean(setStatusError.value));
  const reload = (): Promise<void> => refresh();

  return { requests, hasError, isLoading, actionFailed, reload, setStatus };
};
