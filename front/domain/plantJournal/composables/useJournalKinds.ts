import type { ComputedRef } from 'vue';
import { JournalEntryKind } from '#gql/default';

export type JournalKindMeta = {
  value: JournalEntryKind;
  label: string;
  icon: string;
};

// The display metadata (icon + localised label) of a journal entry kind, shared
// by the add form's picker and each rendered entry, so both name a kind the same.
export const useJournalKinds = (): {
  kinds: ComputedRef<JournalKindMeta[]>;
  metaOf: (kind: JournalEntryKind) => JournalKindMeta;
} => {
  const { t } = useNuxtApp().$i18n;

  const icons: Record<JournalEntryKind, string> = {
    [JournalEntryKind.NOTE]: 'i-lucide-pencil-line',
    [JournalEntryKind.REPOTTING]: 'i-lucide-shovel',
    [JournalEntryKind.NEW_LEAF]: 'i-lucide-sprout',
    [JournalEntryKind.PHOTO]: 'i-lucide-camera',
  };

  // One literal key per kind: the i18n scanner can only check static keys.
  const labelOf = (kind: JournalEntryKind): string => {
    switch (kind) {
      case JournalEntryKind.NOTE:
        return t('plant.journal.kinds.note');
      case JournalEntryKind.REPOTTING:
        return t('plant.journal.kinds.repotting');
      case JournalEntryKind.NEW_LEAF:
        return t('plant.journal.kinds.newLeaf');
      case JournalEntryKind.PHOTO:
        return t('plant.journal.kinds.photo');
    }
  };

  const metaOf = (kind: JournalEntryKind): JournalKindMeta => ({
    value: kind,
    label: labelOf(kind),
    icon: icons[kind],
  });

  const kinds = computed((): JournalKindMeta[] => Object.values(JournalEntryKind).map(metaOf));

  return { kinds, metaOf };
};
