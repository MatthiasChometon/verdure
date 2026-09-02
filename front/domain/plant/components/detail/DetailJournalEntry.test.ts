import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import { JournalEntryKind } from '#gql/default';
import DetailJournalEntry from './DetailJournalEntry.vue';

const baseEntry: JournalEntry = {
  id: 'e1',
  plantId: 'p1',
  kind: JournalEntryKind.REPOTTING,
  note: 'Moved to a bigger pot.',
  imageUrl: null,
  createdAt: '2024-06-01T10:00:00.000Z',
};

describe('PlantDetailJournalEntry', () => {
  it('shows the kind label, the note and the entry date', async () => {
    const wrapper = await mountSuspended(DetailJournalEntry, { props: { entry: baseEntry } });

    expect(wrapper.text()).toContain('Rempotage');
    expect(wrapper.text()).toContain('Moved to a bigger pot.');
    expect(wrapper.find('time').attributes('datetime')).toBe('2024-06-01T10:00:00.000Z');
  });

  it('renders the photo when the entry has one', async () => {
    const wrapper = await mountSuspended(DetailJournalEntry, {
      props: {
        entry: {
          ...baseEntry,
          kind: JournalEntryKind.PHOTO,
          note: null,
          imageUrl: 'http://localhost/images/abc.jpg',
        },
      },
    });

    const image = wrapper.find('img');
    expect(image.exists()).toBe(true);
    expect(image.attributes('src')).toBe('http://localhost/images/abc.jpg');
  });

  it('shows no photo for a text-only entry', async () => {
    const wrapper = await mountSuspended(DetailJournalEntry, { props: { entry: baseEntry } });

    expect(wrapper.find('img').exists()).toBe(false);
  });

  it('emits delete with the entry id when the delete button is pressed', async () => {
    const wrapper = await mountSuspended(DetailJournalEntry, { props: { entry: baseEntry } });

    await wrapper.get('button').trigger('click');

    expect(wrapper.emitted('delete')).toEqual([['e1']]);
  });
});
