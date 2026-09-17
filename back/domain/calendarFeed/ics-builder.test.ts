import { describe, expect, it } from 'vitest';
import { buildIcsFeed, FeedEvent } from './ics-builder';

const event = (overrides: Partial<FeedEvent> = {}): FeedEvent => ({
  uid: 'watering-p1',
  title: 'Arroser Monstera',
  description: "Rappel d'arrosage pour Monstera, généré par verdure.",
  dueOn: '2026-09-15',
  ...overrides,
});

describe('buildIcsFeed', () => {
  it('wraps every event as an all-day VEVENT inside one VCALENDAR', () => {
    const ics = buildIcsFeed([event()]);

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('UID:watering-p1@verdure');
    expect(ics).toContain('DTSTART;VALUE=DATE:20260915');
    expect(ics).toContain('DTEND;VALUE=DATE:20260916');
    expect(ics).toContain('SUMMARY:Arroser Monstera');
    expect(ics).toContain(
      "DESCRIPTION:Rappel d'arrosage pour Monstera\\, généré par verdure.",
    );
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toMatch(/DTSTAMP:\d{8}T\d{6}Z/);
  });

  it('joins every line with CRLF, as the iCalendar format requires', () => {
    const ics = buildIcsFeed([event()]);
    const lines = ics.split('\r\n');

    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(lines.at(-1)).toBe('END:VCALENDAR');
    expect(ics.replaceAll('\r\n', '')).not.toContain('\n');
  });

  it('escapes commas, semicolons and newlines in free text', () => {
    const ics = buildIcsFeed([
      event({
        title: 'Arroser, rempoter; vérifier',
        description: 'Ligne 1\nLigne 2',
      }),
    ]);

    expect(ics).toContain('SUMMARY:Arroser\\, rempoter\\; vérifier');
    expect(ics).toContain('DESCRIPTION:Ligne 1\\nLigne 2');
  });

  it('emits one VEVENT per event, keeping each UID stable', () => {
    const ics = buildIcsFeed([
      event({ uid: 'watering-p1' }),
      event({ uid: 'care-p1-FERTILIZING' }),
    ]);

    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain('UID:watering-p1@verdure');
    expect(ics).toContain('UID:care-p1-FERTILIZING@verdure');
  });

  it('produces a bare VCALENDAR when there are no due events', () => {
    const ics = buildIcsFeed([]);

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).not.toContain('BEGIN:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
  });
});
