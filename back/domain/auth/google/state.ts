import { timingSafeEqual } from 'node:crypto';

// Compared in constant time, like every secret handed back by a browser. The
// length check comes first because timingSafeEqual throws on unequal lengths.
export const isExpectedState = (
  given: string,
  expected: string | undefined,
): boolean => {
  if (expected === undefined) {
    return false;
  }
  const givenBytes = Buffer.from(given);
  const expectedBytes = Buffer.from(expected);
  return (
    givenBytes.length === expectedBytes.length &&
    timingSafeEqual(givenBytes, expectedBytes)
  );
};
