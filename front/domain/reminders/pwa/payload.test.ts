import { describe, expect, it } from 'vitest';
import { parseReminderPayload, safeAppPath, textReminderPayload } from './payload';

const origin = 'https://verdure.example';

describe('parseReminderPayload', () => {
  it('keeps a well-formed reminder', () => {
    expect(
      parseReminderPayload(
        { title: 'Arrosage', body: 'Monstera', url: '/plantes/1?x=1#a' },
        origin,
      ),
    ).toEqual({ title: 'Arrosage', body: 'Monstera', url: '/plantes/1?x=1#a' });
  });

  it.each([
    ['null', null],
    ['a string', 'hello'],
    ['a number', 3],
    ['an empty object', {}],
  ])('falls back to the default reminder for %s', (_name, raw) => {
    expect(parseReminderPayload(raw, origin)).toEqual({ title: 'verdure', body: '', url: '/' });
  });

  it('ignores fields of the wrong type', () => {
    expect(parseReminderPayload({ title: 42, body: ['x'], url: { a: 1 } }, origin)).toEqual({
      title: 'verdure',
      body: '',
      url: '/',
    });
  });

  it('never opens a page outside the app', () => {
    expect(parseReminderPayload({ url: 'https://evil.example/phish' }, origin).url).toBe('/');
  });
});

describe('safeAppPath', () => {
  it.each([
    ['https://evil.example/x'],
    ['//evil.example/x'],
    ['javascript:alert(1)'],
    ['http://verdure.example/x'],
    [undefined],
    [12],
  ])('collapses %s to the home page', (raw) => {
    expect(safeAppPath(raw, origin)).toBe('/');
  });

  it('accepts a same-origin absolute URL and relative paths', () => {
    expect(safeAppPath('https://verdure.example/aujourdhui', origin)).toBe('/aujourdhui');
    expect(safeAppPath('/calendrier', origin)).toBe('/calendrier');
  });
});

describe('textReminderPayload', () => {
  it('shows the raw text of a non-JSON push', () => {
    expect(textReminderPayload('plain')).toEqual({ title: 'verdure', body: 'plain', url: '/' });
  });
});
