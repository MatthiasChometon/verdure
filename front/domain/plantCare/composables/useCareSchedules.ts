import type { ComputedRef, Ref } from 'vue';
import type { CareType } from '#gql/default';

type UseCareSchedules = {
  schedules: ComputedRef<CareSchedule[]>;
  scheduleFor: (type: CareType) => CareSchedule | undefined;
  isLoaded: ComputedRef<boolean>;
  hasError: ComputedRef<boolean>;
  actionFailed: Ref<boolean>;
  isSaving: ComputedRef<boolean>;
  refresh: () => Promise<void>;
  setSchedule: (type: CareType, intervalDays: number) => Promise<boolean>;
  logCare: (type: CareType, doneOn?: string) => Promise<boolean>;
  removeSchedule: (type: CareType) => Promise<boolean>;
};

// The mutation handlers run only after their input is set; this makes that explicit
// instead of asserting it with `!`.
const inputOf = <T>(input: T | undefined): T => {
  if (input === undefined) {
    throw new Error('A care mutation ran before its input was set');
  }
  return input;
};

// Each action reports success so the caller can close its dialog, then reloads so
// due dates stay exact. Errors are the mutations' own reactive refs, never caught by hand.
export const useCareSchedules = (plantId: Ref<string>): UseCareSchedules => {
  const {
    data,
    error,
    refresh: reload,
  } = useQuery('care-schedules', () => GqlCareSchedules({ plantId: plantId.value }), {
    server: false,
    watch: [plantId],
  });

  const schedules = computed((): CareSchedule[] => data.value?.careSchedules ?? []);
  const scheduleFor = (type: CareType): CareSchedule | undefined =>
    schedules.value.find((schedule) => schedule.careType === type);
  const isLoaded = computed((): boolean => data.value !== undefined);
  const hasError = computed((): boolean => Boolean(error.value));

  onMounted(async (): Promise<void> => {
    await reload();
  });

  const actionFailed = ref(false);

  const setInput = ref<{ type: CareType; intervalDays: number }>();
  const {
    status: setStatus,
    error: setError,
    execute: runSet,
  } = useMutation(() => {
    const { type, intervalDays } = inputOf(setInput.value);
    return GqlSetCareSchedule({
      input: { plantId: plantId.value, careType: type, intervalDays },
    });
  });

  const logInput = ref<{ type: CareType; doneOn: string | undefined }>();
  const {
    status: logStatus,
    error: logError,
    execute: runLog,
  } = useMutation(() => {
    const { type, doneOn } = inputOf(logInput.value);
    // GraphQL boundary: no date is sent as null, which means "today" on the back.
    return GqlLogCare({
      input: { plantId: plantId.value, careType: type, doneOn: doneOn ?? null },
    });
  });

  const removeInput = ref<CareType>();
  const {
    status: removeStatus,
    error: removeError,
    execute: runRemove,
  } = useMutation(() =>
    GqlRemoveCareSchedule({
      input: { plantId: plantId.value, careType: inputOf(removeInput.value) },
    }),
  );

  const isSaving = computed(
    (): boolean =>
      setStatus.value === 'pending' ||
      logStatus.value === 'pending' ||
      removeStatus.value === 'pending',
  );

  const runAction = async (
    execute: () => Promise<unknown>,
    failed: Ref<Error | undefined>,
  ): Promise<boolean> => {
    actionFailed.value = false;
    await execute();
    if (failed.value) {
      actionFailed.value = true;
      return false;
    }
    await reload();
    return true;
  };

  const setSchedule = (type: CareType, intervalDays: number): Promise<boolean> => {
    setInput.value = { type, intervalDays };
    return runAction(runSet, setError);
  };

  const logCare = (type: CareType, doneOn?: string): Promise<boolean> => {
    logInput.value = { type, doneOn };
    return runAction(runLog, logError);
  };

  const removeSchedule = (type: CareType): Promise<boolean> => {
    removeInput.value = type;
    return runAction(runRemove, removeError);
  };

  return {
    schedules,
    scheduleFor,
    isLoaded,
    hasError,
    actionFailed,
    isSaving,
    refresh: reload,
    setSchedule,
    logCare,
    removeSchedule,
  };
};
