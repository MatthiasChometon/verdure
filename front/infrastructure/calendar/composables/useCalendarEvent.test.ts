import { describe, expect, it } from 'vitest';
import { useCalendarEvent } from './useCalendarEvent';

const reminder = {
  title: 'Arroser Monstera',
  description: 'Rappel tous les 5 jours.',
  startDate: '2026-09-15',
  intervalDays: 5,
};

describe('useCalendarEvent', () => {
  describe('buildIcs', () => {
    it('wraps a single all-day recurring VEVENT in a VCALENDAR', () => {
      const { buildIcs } = useCalendarEvent();

      const ics = buildIcs(reminder);

      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('BEGIN:VEVENT');
      expect(ics).toContain('DTSTART;VALUE=DATE:20260915');
      expect(ics).toContain('DTEND;VALUE=DATE:20260916');
      expect(ics).toContain('RRULE:FREQ=DAILY;INTERVAL=5');
      expect(ics).toContain('SUMMARY:Arroser Monstera');
      expect(ics).toContain('DESCRIPTION:Rappel tous les 5 jours.');
      expect(ics).toContain('END:VEVENT');
      expect(ics).toContain('END:VCALENDAR');
      expect(ics).toMatch(/UID:[^\r\n]+@verdure/);
      expect(ics).toMatch(/DTSTAMP:\d{8}T\d{6}Z/);
    });

    it('joins every line with CRLF, as the iCalendar format requires', () => {
      const { buildIcs } = useCalendarEvent();

      const ics = buildIcs(reminder);
      const lines = ics.split('\r\n');

      expect(lines[0]).toBe('BEGIN:VCALENDAR');
      expect(lines.at(-1)).toBe('END:VCALENDAR');
      expect(ics.replaceAll('\r\n', '')).not.toContain('\n');
    });

    it('escapes commas, semicolons and newlines in free text', () => {
      const { buildIcs } = useCalendarEvent();

      const ics = buildIcs({
        ...reminder,
        title: 'Arroser, rempoter; vérifier',
        description: 'Ligne 1\nLigne 2',
      });

      expect(ics).toContain('SUMMARY:Arroser\\, rempoter\\; vérifier');
      expect(ics).toContain('DESCRIPTION:Ligne 1\\nLigne 2');
    });
  });

  describe('icsDataUrl', () => {
    it('embeds a full ICS calendar as a data: URI, without forcing a download', () => {
      const { icsDataUrl } = useCalendarEvent();

      const url = icsDataUrl(reminder);
      const decoded = decodeURIComponent(url.split(',').slice(1).join(','));

      expect(url.startsWith('data:text/calendar;charset=utf-8,')).toBe(true);
      expect(decoded).toContain('BEGIN:VCALENDAR');
      expect(decoded).toContain('SUMMARY:Arroser Monstera');
    });
  });

  describe('googleCalendarUrl', () => {
    it('encodes the event as a Google Calendar quick-add link', () => {
      const { googleCalendarUrl } = useCalendarEvent();

      const url = googleCalendarUrl(reminder);
      const params = new URL(url).searchParams;

      expect(url.startsWith('https://calendar.google.com/calendar/render?')).toBe(true);
      expect(params.get('text')).toBe('Arroser Monstera');
      expect(params.get('dates')).toBe('20260915/20260916');
      expect(params.get('recur')).toBe('RRULE:FREQ=DAILY;INTERVAL=5');
    });
  });
});
