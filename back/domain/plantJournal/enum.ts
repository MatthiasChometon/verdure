import { registerEnumType } from '@nestjs/graphql';

// REPOTTING/NEW_LEAF are timeline milestones; PHOTO is an entry whose point is the picture.
export enum JournalEntryKind {
  NOTE = 'NOTE',
  REPOTTING = 'REPOTTING',
  NEW_LEAF = 'NEW_LEAF',
  PHOTO = 'PHOTO',
}

registerEnumType(JournalEntryKind, { name: 'JournalEntryKind' });
