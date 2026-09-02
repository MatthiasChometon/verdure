import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import { JournalEntryKind } from '#gql/default';
import DetailJournalTimeline from './DetailJournalTimeline.vue';

// The parent passes the photo entries newest-first, as the query returns them.
const photos: JournalEntry[] = [
  {
    id: 'newest',
    plantId: 'p1',
    kind: JournalEntryKind.PHOTO,
    note: null,
    imageUrl: 'http://localhost/images/june.jpg',
    createdAt: '2024-06-01T10:00:00.000Z',
  },
  {
    id: 'oldest',
    plantId: 'p1',
    kind: JournalEntryKind.PHOTO,
    note: null,
    imageUrl: 'http://localhost/images/may.jpg',
    createdAt: '2024-05-01T10:00:00.000Z',
  },
];

describe('PlantDetailJournalTimeline', () => {
  it('shows the photos oldest to newest (growth reads left to right)', async () => {
    const wrapper = await mountSuspended(DetailJournalTimeline, { props: { entries: photos } });

    const sources = wrapper.findAll('img').map((image) => image.attributes('src'));
    expect(sources).toEqual([
      'http://localhost/images/may.jpg',
      'http://localhost/images/june.jpg',
    ]);
  });

  it('captions each photo with a dated time element', async () => {
    const wrapper = await mountSuspended(DetailJournalTimeline, { props: { entries: photos } });

    const dates = wrapper.findAll('time').map((time) => time.attributes('datetime'));
    expect(dates).toEqual(['2024-05-01T10:00:00.000Z', '2024-06-01T10:00:00.000Z']);
  });
});
