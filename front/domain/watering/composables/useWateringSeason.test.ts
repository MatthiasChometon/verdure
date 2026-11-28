import { describe, expect, it } from 'vitest';
import { useWateringSeason } from './useWateringSeason';

const { intervalOn } = useWateringSeason();

describe('useWateringSeason', () => {
  it.each([
    ['2026-03-31', 14],
    ['2026-04-01', 7],
    ['2026-09-30', 7],
    ['2026-10-01', 14],
  ])('applies the interval of the season %s falls in', (isoDate, expected) => {
    expect(intervalOn(isoDate, 7, 14)).toBe(expected);
  });

  it('is undefined when the season has no interval', () => {
    expect(intervalOn('2026-07-01', undefined, 14)).toBeUndefined();
  });
});
