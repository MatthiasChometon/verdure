import type { ComputedRef, MaybeRefOrGetter } from 'vue';
import { JournalEntryKind } from '#gql/default';

type UsePlantJournal = {
  entries: ComputedRef<JournalEntry[]>;
  photos: ComputedRef<JournalEntry[]>;
  isLoaded: ComputedRef<boolean>;
  hasError: ComputedRef<boolean>;
  isAdding: ComputedRef<boolean>;
  addFailed: ComputedRef<boolean>;
  refresh: () => Promise<void>;
  addEntry: (entry: NewJournalEntry) => Promise<boolean>;
  removeEntry: (id: string) => Promise<void>;
};

// The journal of one plant: the entries newest-first, the photos among them for
// the growth timeline, and the optimistic add/remove actions. Reuses the shared
// plant-image upload endpoint for an entry's optional photo.
export const usePlantJournal = (plantId: MaybeRefOrGetter<string>): UsePlantJournal => {
  const id = computed((): string => toValue(plantId));

  const { data, error, refresh } = useQuery(
    'plant-journal',
    () => GqlJournalEntries({ plantId: id.value }),
    { server: false, watch: [id] },
  );
  const entries = computed((): JournalEntry[] => data.value?.journalEntries ?? []);
  const photos = computed((): JournalEntry[] =>
    entries.value.filter((entry) => entry.imageUrl !== null),
  );
  const isLoaded = computed((): boolean => data.value !== undefined);
  const hasError = computed((): boolean => Boolean(error.value));

  // First load by hand — the query is lazy; the watch only refires on a later id
  // change (navigating from one plant's page to another's).
  onMounted((): void => {
    void refresh();
  });

  const { upload: uploadPhoto } = useImageUpload(
    '/uploads/plant-image',
    'journal',
    'journal-image-upload',
  );

  // The upload runs inside the mutation, so its failure surfaces through the same
  // reactive error and rolls the optimistic entry back — never a try/catch here.
  const draft = ref<NewJournalEntry>({
    kind: JournalEntryKind.NOTE,
    note: '',
    file: null,
  });
  let previewUrl: string | null = null;
  const {
    status: addStatus,
    error: addError,
    execute: runAdd,
  } = useMutation(async (): Promise<void> => {
    const imageKey = draft.value.file === null ? null : await uploadPhoto(draft.value.file);
    await GqlAddJournalEntry({
      input: {
        plantId: id.value,
        kind: draft.value.kind,
        note: draft.value.note.trim() || null,
        imageKey,
      },
    });
  });
  const isAdding = computed((): boolean => addStatus.value === 'pending');
  const addFailed = computed((): boolean => Boolean(addError.value));

  const revokePreview = (): void => {
    if (previewUrl !== null) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = null;
    }
  };

  const optimisticEntry = (entry: NewJournalEntry): JournalEntry => ({
    id: `optimistic-${Date.now()}`,
    plantId: id.value,
    kind: entry.kind,
    note: entry.note.trim() || null,
    imageUrl: previewUrl,
    createdAt: new Date().toISOString(),
  });

  const addEntry = async (entry: NewJournalEntry): Promise<boolean> => {
    draft.value = entry;
    revokePreview();
    previewUrl = entry.file === null ? null : URL.createObjectURL(entry.file);
    const optimistic = optimisticEntry(entry);
    const ok = await useOptimisticUpdate(
      data,
      (current) =>
        current === undefined
          ? current
          : { ...current, journalEntries: [optimistic, ...current.journalEntries] },
      { execute: runAdd, error: addError },
    );
    // Reconcile the real id, timestamp and served photo URL on success; the local
    // preview URL has done its job either way.
    if (ok) {
      await refresh();
    }
    revokePreview();
    return ok;
  };

  const removeId = ref('');
  const { execute: runRemove, error: removeError } = useMutation(() =>
    GqlDeleteJournalEntry({ id: removeId.value }),
  );

  const removeEntry = async (id: string): Promise<void> => {
    removeId.value = id;
    await useOptimisticUpdate(
      data,
      (current) =>
        current === undefined
          ? current
          : {
              ...current,
              journalEntries: current.journalEntries.filter((entry) => entry.id !== id),
            },
      { execute: runRemove, error: removeError },
    );
  };

  onScopeDispose(revokePreview);

  return {
    entries,
    photos,
    isLoaded,
    hasError,
    isAdding,
    addFailed,
    refresh,
    addEntry,
    removeEntry,
  };
};
