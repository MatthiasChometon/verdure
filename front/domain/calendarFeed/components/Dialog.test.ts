import { mockNuxtImport, renderSuspended } from '@nuxt/test-utils/runtime';
import { fireEvent, screen } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import type { Ref } from 'vue';
import Dialog from './Dialog.vue';

type FeedTokenData = { calendarFeedToken: string } | undefined;

const { useCalendarFeedMock, useQueryMock, useMutationMock } = vi.hoisted(() => ({
  useCalendarFeedMock: vi.fn(),
  useQueryMock: vi.fn(),
  useMutationMock: vi.fn(),
}));

mockNuxtImport('useCalendarFeed', () => useCalendarFeedMock);
mockNuxtImport('useQuery', () => useQueryMock);
mockNuxtImport('useMutation', () => useMutationMock);

let close: ReturnType<typeof vi.fn>;
let data: Ref<FeedTokenData>;
let status: Ref<string>;
let regenerateExecute: ReturnType<typeof vi.fn>;
let regenerateStatus: Ref<string>;

beforeEach(() => {
  close = vi.fn();
  useCalendarFeedMock.mockReturnValue({ isOpen: ref(true), open: vi.fn(), close });

  data = ref<FeedTokenData>({ calendarFeedToken: 'abc123' });
  status = ref('success');
  useQueryMock.mockReturnValue({ data, status, refresh: vi.fn().mockResolvedValue(undefined) });

  regenerateExecute = vi.fn();
  regenerateStatus = ref('idle');
  useMutationMock.mockReturnValue({
    status: regenerateStatus,
    execute: regenerateExecute,
    error: ref(undefined),
  });
});

// The modal teleports to <body>; clear it so renders don't accumulate.
afterEach(() => {
  document.body.innerHTML = '';
});

describe('CalendarFeedDialog', () => {
  it('shows the feed URL and per-app instructions once the token has loaded', async () => {
    await renderSuspended(Dialog);
    expect(screen.getByDisplayValue(/\/calendar-feed\/abc123$/)).toBeTruthy();
    expect(screen.getByText('Google Agenda et Android')).toBeTruthy();
    expect(screen.getByText('iPhone et Apple Calendrier')).toBeTruthy();
  });

  it('shows a loading skeleton while the token is still being read', async () => {
    status.value = 'pending';
    data.value = undefined;
    await renderSuspended(Dialog);
    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.queryByText('Google Agenda et Android')).toBeNull();
  });

  it('shows a failure message when the token failed to load', async () => {
    status.value = 'error';
    data.value = undefined;
    await renderSuspended(Dialog);
    expect(
      screen.getByText('Impossible de charger ton lien de calendrier. Réessaie dans un instant.'),
    ).toBeTruthy();
  });

  it('regenerates the token on click', async () => {
    await renderSuspended(Dialog);
    await fireEvent.click(screen.getByRole('button', { name: 'Générer un nouveau lien' }));
    expect(regenerateExecute).toHaveBeenCalledTimes(1);
  });

  it('confirms once the token has been regenerated', async () => {
    regenerateStatus.value = 'success';
    await renderSuspended(Dialog);
    expect(screen.getByText('Nouveau lien généré.')).toBeTruthy();
  });

  it('closes on click', async () => {
    await renderSuspended(Dialog);
    await fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(close).toHaveBeenCalledTimes(1);
  });
});
