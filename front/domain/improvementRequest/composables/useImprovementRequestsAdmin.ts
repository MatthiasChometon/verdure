import type { ComputedRef } from 'vue';
import type { ImprovementRequestsQuery } from '#gql';
import { ImprovementStatus } from '#gql/default';

type Request = ImprovementRequestsQuery['improvementRequests'][number];

type UseImprovementRequestsAdmin = {
  requests: ComputedRef<Request[]>;
  hasError: ComputedRef<boolean>;
  setStatus: (id: string, status: ImprovementStatus) => Promise<void>;
};

// The admin improvement-requests inbox: the requests (admins only) and the one
// moderation action — setting a request's status — reconciling the list after.
export const useImprovementRequestsAdmin = (): UseImprovementRequestsAdmin => {
  const { isAdmin } = useAdmin();

  // No try/catch: useAsyncData captures failures into `error` while `default` keeps
  // `data` a list either way — swallowing errors would hide a failure silently.
  const { data, error, refresh } = useAsyncData(
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

  return { requests, hasError, setStatus };
};
