type SaveState = 'idle' | 'saving' | 'saved' | 'failed';

type UsePlantnetKey = {
  isOpen: Ref<boolean>;
  state: Ref<SaveState>;
  open: () => void;
  close: () => void;
  save: (key: string) => Promise<void>;
  clear: () => Promise<void>;
};

// The per-user Pl@ntNet key settings dialog: shared open state (the account menu
// opens it), plus save/clear that persist the key and refresh `me` so the
// "configured" status updates without a reload. The key itself is write-only —
// the API only ever tells us whether one is set (`hasPlantnetKey`).
export const usePlantnetKey = (): UsePlantnetKey => {
  const isOpen = useState<boolean>('plantnet-key:open', (): boolean => false);
  const state = useState<SaveState>('plantnet-key:state', (): SaveState => 'idle');
  const { refresh } = useAuth();

  const persist = async (key: string | null): Promise<void> => {
    state.value = 'saving';
    try {
      await GqlSetPlantnetApiKey({ key });
      await refresh();
      state.value = key === null ? 'idle' : 'saved';
    } catch {
      state.value = 'failed';
    }
  };

  return {
    isOpen,
    state,
    open: (): void => {
      state.value = 'idle';
      isOpen.value = true;
    },
    close: (): void => {
      isOpen.value = false;
    },
    save: (key: string): Promise<void> => persist(key.trim() || null),
    clear: (): Promise<void> => persist(null),
  };
};
