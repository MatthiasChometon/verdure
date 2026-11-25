import type { ComputedRef, MaybeRefOrGetter } from 'vue';
import { JournalEntryKind } from '#gql/default';

type UsePlantJournal = {
  entries: ComputedRef<JournalEntry[]>;
  photos: ComputedRef<PhotoEntry[]>;
  isLoaded: ComputedRef<boolean>;
  hasError: ComputedRef<boolean>;
  isAdding: ComputedRef<boolean>;
  addFailed: ComputedRef<boolean>;
  // The last deletion was refused: the entry is back in the list.
  removeFailed: ComputedRef<boolean>;
  refresh: () => Promise<void>;
  addEntry: (entry: NewJournalEntry) => Promise<boolean>;
  removeEntry: (id: string) => Promise<void>;
};

// Reuses the shared plant-image upload endpoint for an entry's optional photo.
export const usePlantJournal = (plantId: MaybeRefOrGetter<string>): UsePlantJournal => {
  const id = computed((): string => toValue(plantId));

  const { data, error, refresh } = useQuery(
    'plant-journal',
    () => GqlJournalEntries({ plantId: id.value }),
    { server: false, watch: [id] },
  );
  const entries = computed((): JournalEntry[] => data.value?.journalEntries ?? []);
  const hasPhoto = (entry: JournalEntry): entry is PhotoEntry => typeof entry.imageUrl === 'string';
  const photos = computed((): PhotoEntry[] => entries.value.filter(hasPhoto));
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
    file: undefined,
  });
  let previewUrl: string | undefined;
  const {
    status: addStatus,
    error: addError,
    execute: runAdd,
  } = useMutation(async (): Promise<void> => {
    const { file, kind, note } = draft.value;
    const imageKey = file === undefined ? undefined : await uploadPhoto(file);
    // GraphQL boundary: absent optional fields are sent as null.
    await GqlAddJournalEntry({
      input: { plantId: id.value, kind, note: note.trim() || null, imageKey: imageKey ?? null },
    });
  });
  const isAdding = computed((): boolean => addStatus.value === 'pending');
  const addFailed = computed((): boolean => Boolean(addError.value));

  const revokePreview = (): void => {
    if (previewUrl !== undefined) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = undefined;
    }
  };

  // Shaped like the query's rows, whose absent fields are null.
  const optimisticEntry = (entry: NewJournalEntry): JournalEntry => ({
    id: `optimistic-${Date.now()}`,
    plantId: id.value,
    kind: entry.kind,
    note: entry.note.trim() || null,
    imageUrl: previewUrl ?? null,
    createdAt: new Date().toISOString(),
  });

  const addEntry = async (entry: NewJournalEntry): Promise<boolean> => {
    draft.value = entry;
    revokePreview();
    previewUrl = entry.file === undefined ? undefined : URL.createObjectURL(entry.file);
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

  const removeFailed = ref(false);

  const removeEntry = async (id: string): Promise<void> => {
    removeFailed.value = false;
    removeId.value = id;
    const ok = await useOptimisticUpdate(
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
    removeFailed.value = !ok;
  };

  onScopeDispose(revokePreview);

  return {
    entries,
    photos,
    isLoaded,
    hasError,
    isAdding,
    addFailed,
    removeFailed: computed((): boolean => removeFailed.value),
    refresh,
    addEntry,
    removeEntry,
  };
};
