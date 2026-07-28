type MutationStatus = 'idle' | 'pending' | 'success' | 'error';

type UseMutation<DataT> = {
  data: Ref<DataT | undefined>;
  status: Ref<MutationStatus>;
  error: Ref<Error | null>;
  execute: () => Promise<void>;
  clear: () => void;
};

// Imperative wrapper for GraphQL mutations: runs the handler on demand and
// exposes reactive status/error, without the per-key cache useQuery keeps for
// reads (a mutation result is never re-read).
export const useMutation = <DataT>(handler: () => Promise<DataT>): UseMutation<DataT> => {
  const data = shallowRef<DataT>();
  const status = ref<MutationStatus>('idle');
  const error = ref<Error | null>(null);

  const execute = async (): Promise<void> => {
    status.value = 'pending';
    error.value = null;

    try {
      data.value = await handler();
      status.value = 'success';
    } catch (cause) {
      error.value = cause instanceof Error ? cause : new Error(String(cause));
      status.value = 'error';
    }
  };

  const clear = (): void => {
    error.value = null;
    status.value = 'idle';
  };

  return { data, status, error, execute, clear };
};
