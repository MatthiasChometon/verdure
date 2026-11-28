import { describe, expect, it } from 'vitest';
import { imageSrcset, imageVariant } from './imageVariants';

describe('image variants', () => {
  it('asks the API for a width', () => {
    expect(imageVariant('http://api/images/abc', 480)).toBe('http://api/images/abc?w=480');
  });

  it('lists the widths of a srcset', () => {
    expect(imageSrcset('http://api/images/abc', [480, 960])).toBe(
      'http://api/images/abc?w=480 480w, http://api/images/abc?w=960 960w',
    );
  });
});
