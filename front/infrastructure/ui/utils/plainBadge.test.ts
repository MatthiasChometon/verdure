import theme from '#build/ui/badge';
import { tv } from '#ui/utils/tv';
import { describe, expect, it } from 'vitest';
import { plainBadgeClasses } from './plainBadge';

const classSet = (classes: string): string[] => classes.split(/\s+/).filter(Boolean).sort();

describe('plainBadgeClasses', () => {
  it('matches UBadge primary soft sm', () => {
    const expected = tv(theme)({ color: 'primary', variant: 'soft', size: 'sm' }).base();

    expect(classSet(plainBadgeClasses)).toEqual(classSet(expected));
  });
});
