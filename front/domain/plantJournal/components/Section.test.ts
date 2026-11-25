import { mockNuxtImport, renderSuspended } from '@nuxt/test-utils/runtime';
import { screen } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PlantJournalSection from './Section.vue';

const state = vi.hoisted(() => ({ hasError: false, removeFailed: false }));

mockNuxtImport('usePlantJournal', () => (): unknown => ({
  entries: computed(() => []),
  photos: computed(() => []),
  isLoaded: computed(() => !state.hasError),
  hasError: computed(() => state.hasError),
  isAdding: computed(() => false),
  addFailed: computed(() => false),
  removeFailed: computed(() => state.removeFailed),
  refresh: async (): Promise<void> => undefined,
  addEntry: async (): Promise<boolean> => true,
  removeEntry: async (): Promise<void> => undefined,
}));

describe('PlantJournalSection', () => {
  beforeEach(() => {
    state.hasError = false;
    state.removeFailed = false;
  });

  it('announces a failed load as an alert', async () => {
    state.hasError = true;
    await renderSuspended(PlantJournalSection, { props: { plantId: 'p1' } });

    expect(screen.getByRole('alert').textContent).toContain('Impossible de charger le journal');
  });

  it('announces a refused deletion as an alert', async () => {
    state.removeFailed = true;
    await renderSuspended(PlantJournalSection, { props: { plantId: 'p1' } });

    expect(screen.getByRole('alert').textContent).toContain('La suppression a échoué');
  });

  it('shows no alert while nothing failed', async () => {
    await renderSuspended(PlantJournalSection, { props: { plantId: 'p1' } });

    expect(screen.queryByRole('alert')).toBeNull();
  });
});
