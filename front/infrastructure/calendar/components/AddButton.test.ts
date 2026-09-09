import { mockNuxtImport, renderSuspended } from '@nuxt/test-utils/runtime';
import { fireEvent, screen } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AddButton from './AddButton.vue';

const { useCalendarEventMock } = vi.hoisted(() => ({ useCalendarEventMock: vi.fn() }));
mockNuxtImport('useCalendarEvent', () => useCalendarEventMock);

const reminder = {
  title: 'Arroser Monstera',
  description: 'Rappel tous les 5 jours.',
  startDate: '2026-09-15',
  intervalDays: 5,
};

const icsDataUrl = vi.fn(() => 'data:text/calendar;charset=utf-8,BEGIN%3AVCALENDAR');
const googleCalendarUrl = vi.fn(() => 'https://calendar.google.com/calendar/render?text=x');

beforeEach(() => {
  icsDataUrl.mockClear();
  googleCalendarUrl.mockClear();
  useCalendarEventMock.mockReturnValue({ icsDataUrl, googleCalendarUrl, buildIcs: vi.fn() });
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('CalendarAddButton', () => {
  it('links the .ics option directly to the data: URI, no forced download', async () => {
    await renderSuspended(AddButton, { props: { reminder } });

    await fireEvent.click(screen.getByRole('button', { name: 'Ajouter au calendrier' }));
    const link = (await screen.findByText('Télécharger (.ics)')).closest('a');

    expect(link?.getAttribute('href')).toBe(icsDataUrl());
    expect(link?.hasAttribute('download')).toBe(false);
  });

  it('links the Google Calendar option to the generated quick-add URL', async () => {
    await renderSuspended(AddButton, { props: { reminder } });

    await fireEvent.click(screen.getByRole('button', { name: 'Ajouter au calendrier' }));
    const link = (await screen.findByText('Google Calendar')).closest('a');

    expect(link?.getAttribute('href')).toBe(googleCalendarUrl());
    expect(link?.getAttribute('target')).toBe('_blank');
  });
});
