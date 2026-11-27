import theme from '#build/ui/avatar';
import { tv } from '#ui/utils/tv';
import { describe, expect, it } from 'vitest';
import { avatarInitials, plainAvatarClasses } from './plainAvatar';

const classSet = (classes: string): string[] => classes.split(/\s+/).filter(Boolean).sort();

describe('plainAvatarClasses', () => {
  it('matches UAvatar neutral sm for every slot', () => {
    const slots = tv(theme)({ size: 'sm', color: 'neutral' });

    expect(classSet(plainAvatarClasses.root)).toEqual(classSet(slots.root()));
    expect(classSet(plainAvatarClasses.image)).toEqual(classSet(slots.image()));
    expect(classSet(plainAvatarClasses.fallback)).toEqual(classSet(slots.fallback()));
  });
});

describe('avatarInitials', () => {
  it('keeps the first letter of the first two words', () => {
    expect(avatarInitials('Ada Lovelace')).toBe('AL');
    expect(avatarInitials('Ada Byron Lovelace')).toBe('AB');
    expect(avatarInitials('Ada')).toBe('A');
  });
});
