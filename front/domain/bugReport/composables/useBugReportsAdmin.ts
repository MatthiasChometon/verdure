import type { ComputedRef } from 'vue';
import type { BugReportsQuery } from '#gql';
import { BugStatus } from '#gql/default';

type Report = BugReportsQuery['bugReports'][number];

type UseBugReportsAdmin = {
  reports: ComputedRef<Report[]>;
  hasError: ComputedRef<boolean>;
  setStatus: (id: string, status: BugStatus) => Promise<void>;
  setBlocked: (reportId: string, blocked: boolean) => Promise<void>;
};

// Admin bug-report inbox: reports (admins only) plus status and blocked-reporter
// moderation actions, each reconciling the list afterwards.
export const useBugReportsAdmin = (): UseBugReportsAdmin => {
  const { isAdmin } = useAdmin();

  // No try/catch: useAsyncData captures failures into `error` while `default` keeps
  // `data` a list either way — swallowing errors would hide a failure silently.
  const { data, error, refresh } = useAsyncData(
    'bug:reports',
    async (): Promise<Report[]> => {
      if (!isAdmin.value) {
        return [];
      }
      const result = await GqlBugReports();
      return result.bugReports;
    },
    { server: false, watch: [isAdmin], default: (): Report[] => [] },
  );
  const reports = computed((): Report[] => data.value ?? []);
  const hasError = computed((): boolean => Boolean(error.value));

  const statusId = ref('');
  const statusValue = ref<BugStatus>(BugStatus.NEW);
  const { execute: runSetStatus, error: setStatusError } = useMutation(() =>
    GqlSetBugStatus({ input: { id: statusId.value, status: statusValue.value } }),
  );
  const setStatus = async (id: string, status: BugStatus): Promise<void> => {
    statusId.value = id;
    statusValue.value = status;
    await runSetStatus();
    if (!setStatusError.value) {
      await refresh();
    }
  };

  const blockId = ref('');
  const blockValue = ref(false);
  const { execute: runSetBlocked, error: setBlockedError } = useMutation(() =>
    GqlBlockReporter({ input: { reportId: blockId.value, blocked: blockValue.value } }),
  );
  // Acted on from the report being read — that's where a flood shows itself.
  // Reversible on the spot: an undoable judgement is one nobody dares make.
  const setBlocked = async (reportId: string, blocked: boolean): Promise<void> => {
    blockId.value = reportId;
    blockValue.value = blocked;
    await runSetBlocked();
    if (!setBlockedError.value) {
      await refresh();
    }
  };

  return { reports, hasError, setStatus, setBlocked };
};
