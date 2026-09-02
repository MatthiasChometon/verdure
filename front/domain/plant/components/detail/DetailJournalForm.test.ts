import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import { JournalEntryKind } from '#gql/default';
import DetailJournalForm from './DetailJournalForm.vue';

describe('PlantDetailJournalForm', () => {
  it('offers the four entry kinds', async () => {
    const wrapper = await mountSuspended(DetailJournalForm);

    const text = wrapper.text();
    expect(text).toContain('Note');
    expect(text).toContain('Rempotage');
    expect(text).toContain('Nouvelle feuille');
    expect(text).toContain('Photo');
  });

  it('cannot be submitted while empty', async () => {
    const wrapper = await mountSuspended(DetailJournalForm);

    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined();
  });

  it('emits the entry with its note and default kind once a note is typed', async () => {
    const wrapper = await mountSuspended(DetailJournalForm);

    await wrapper.find('textarea').setValue('A new leaf appeared.');
    await wrapper.find('form').trigger('submit.prevent');

    expect(wrapper.emitted('submit')).toEqual([
      [{ kind: JournalEntryKind.NOTE, note: 'A new leaf appeared.', file: null }],
    ]);
  });

  it('emits the kind the user selected', async () => {
    const wrapper = await mountSuspended(DetailJournalForm);

    const repotting = wrapper.findAll('button').find((button) => button.text() === 'Rempotage');
    await repotting?.trigger('click');
    await wrapper.find('textarea').setValue('Fresh soil.');
    await wrapper.find('form').trigger('submit.prevent');

    const [[entry]] = wrapper.emitted('submit') as [[NewJournalEntry]];
    expect(entry.kind).toBe(JournalEntryKind.REPOTTING);
    expect(entry.note).toBe('Fresh soil.');
  });
});
