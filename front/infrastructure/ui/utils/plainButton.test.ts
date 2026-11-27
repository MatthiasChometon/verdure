import theme from '#build/ui/button';
import { tv } from '#ui/utils/tv';
import { describe, expect, it } from 'vitest';
import { plainButtonClasses, type PlainButtonSize, type PlainButtonVariant } from './plainButton';

const colors: Record<PlainButtonVariant, 'neutral' | 'primary'> = {
  ghost: 'neutral',
  subtle: 'neutral',
  solid: 'primary',
};
const classSet = (classes: string): string[] => classes.split(/\s+/).filter(Boolean).sort();

describe('plainButtonClasses', () => {
  const variants: PlainButtonVariant[] = ['ghost', 'subtle', 'solid'];
  const sizes: PlainButtonSize[] = ['sm', 'md', 'lg'];

  for (const variant of variants) {
    for (const size of sizes) {
      for (const square of [false, true]) {
        it(`matches UButton ${variant} ${size}${square ? ' square' : ''}`, () => {
          const expected = tv(theme)({ color: colors[variant], variant, size, square }).base();

          expect(classSet(plainButtonClasses(variant, size, square))).toEqual(classSet(expected));
        });
      }
    }
  }
});
