import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { PlantnetKeyPipe } from './plantnet-key.pipe';

const pipe = new PlantnetKeyPipe();

describe('PlantnetKeyPipe', () => {
  it.each([null, undefined, '', '   '])('reads %j as "clear the key"', (v) => {
    expect(pipe.transform(v)).toBeNull();
  });

  it('keeps a key, trimmed', () => {
    expect(pipe.transform('  2b10AbCdEf  ')).toBe('2b10AbCdEf');
  });

  it.each([
    ['a space inside', 'abc def'],
    ['a line break', 'abc\ndef'],
    ['a control character', 'abc\u0000def'],
    ['a non-ASCII character', 'clé'],
    ['too long', 'a'.repeat(201)],
  ])('refuses a key with %s', (_case, value) => {
    expect(() => pipe.transform(value)).toThrow(BadRequestException);
  });
});
