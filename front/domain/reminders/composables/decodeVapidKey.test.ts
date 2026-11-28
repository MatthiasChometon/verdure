import { describe, expect, it } from 'vitest';
import { decodeVapidKey } from './decodeVapidKey';

describe('decodeVapidKey', () => {
  it('decodes base64url, padded or not', () => {
    expect([...(decodeVapidKey('SGVsbG8') ?? [])]).toEqual([72, 101, 108, 108, 111]);
    expect([...(decodeVapidKey('-_8') ?? [])]).toEqual([251, 255]);
  });

  it.each([
    ['an empty key', ''],
    ['standard base64 characters', 'SGVs+G8/'],
    ['whitespace', 'SGVs bG8'],
    ['an impossible length', 'SGVsb'],
    ['a pasted URL', 'https://example.com'],
  ])('refuses %s instead of throwing', (_name, key) => {
    expect(decodeVapidKey(key)).toBeUndefined();
  });
});
