import type { JournalEntriesQuery } from '#gql';

// A single journal entry as its query returns it: a dated note, milestone, or
// photo on a plant's timeline.
export type JournalEntry = JournalEntriesQuery['journalEntries'][number];

// The fields the add form collects; the composable turns these into the upload +
// mutation (kind is the GraphQL enum, note the free text, file the optional photo).
export type NewJournalEntry = {
  kind: JournalEntry['kind'];
  note: string;
  file: File | null;
};
