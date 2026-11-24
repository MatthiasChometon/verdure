import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { pickBrandTokens } from './buildDynamicLayers';

describe('pickBrandTokens', () => {
  it('returns the absolute path of the single tokens stylesheet', () => {
    const file = 'domain/site/style/tokens.css';

    expect(pickBrandTokens([file])).toBe(resolve(file));
  });

  it('throws when no tokens stylesheet exists', () => {
    expect(() => pickBrandTokens([])).toThrow('brand tokens are missing');
  });

  it('throws when several slices define one, naming them', () => {
    const files = ['domain/site/style/tokens.css', 'domain/other/style/tokens.css'];

    expect(() => pickBrandTokens(files)).toThrow(/found 2: .*site.*other/);
  });
});
