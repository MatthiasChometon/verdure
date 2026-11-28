import { describe, expect, it } from 'vitest';

describe('isCompiledMessage', () => {
  it('accepts a message function and a compiled AST node', () => {
    expect(isCompiledMessage(() => 'text')).toBe(true);
    expect(isCompiledMessage({ type: 0, body: { type: 1, items: [] } })).toBe(true);
  });

  it('refuses malformed nodes', () => {
    expect(isCompiledMessage(null)).toBe(false);
    expect(isCompiledMessage('plain')).toBe(false);
    expect(isCompiledMessage({})).toBe(false);
    expect(isCompiledMessage({ type: 'x', body: {} })).toBe(false);
    expect(isCompiledMessage({ type: 0, body: null })).toBe(false);
    expect(isCompiledMessage({ type: 0 })).toBe(false);
  });
});
