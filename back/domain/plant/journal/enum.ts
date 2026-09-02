import { registerEnumType } from '@nestjs/graphql';

// What a journal entry records. `note` is a free remark; `repotting` and
// `new_leaf` are milestones worth spotting at a glance on the timeline; `photo`
// is an entry whose point is the picture (growth over time).
export enum JournalEntryKind {
  NOTE = 'NOTE',
  REPOTTING = 'REPOTTING',
  NEW_LEAF = 'NEW_LEAF',
  PHOTO = 'PHOTO',
}

registerEnumType(JournalEntryKind, { name: 'JournalEntryKind' });
