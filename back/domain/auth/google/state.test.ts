import { isExpectedState } from './state';

describe('isExpectedState', () => {
  it('accepts the state that was stored', () => {
    expect(isExpectedState('abc-123', 'abc-123')).toBe(true);
  });

  it('refuses a different state of the same length', () => {
    expect(isExpectedState('abc-123', 'abc-124')).toBe(false);
  });

  it('refuses a different length without throwing', () => {
    expect(isExpectedState('abc', 'abc-123')).toBe(false);
  });

  it('refuses when no state was stored', () => {
    expect(isExpectedState('abc-123', undefined)).toBe(false);
  });
});
