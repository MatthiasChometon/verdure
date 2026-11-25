import { BadRequestException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { CalendarFeedTokenPipe } from './token.pipe';

const pipe = new CalendarFeedTokenPipe();

describe('CalendarFeedTokenPipe', () => {
  it('lets a token as minted pass', () => {
    const token = randomBytes(32).toString('hex');

    expect(pipe.transform(token)).toBe(token);
  });

  it.each([
    ['empty', ''],
    ['too short', 'a'.repeat(63)],
    ['too long', 'a'.repeat(65)],
    ['upper case', 'A'.repeat(64)],
    ['not hexadecimal', 'g'.repeat(64)],
    ['a path walk', `../${'a'.repeat(61)}`],
    ['an array', ['a'.repeat(64)]],
  ])('refuses %s', (_case, value) => {
    expect(() => pipe.transform(value)).toThrow(BadRequestException);
  });
});
