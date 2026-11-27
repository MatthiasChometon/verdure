export type PlainButtonVariant = 'ghost' | 'subtle' | 'solid';
export type PlainButtonSize = 'sm' | 'md' | 'lg';

// Static class lists equal to what Nuxt UI's `UButton` resolves for these combinations
// (ghost and subtle are neutral, solid is primary). They are literal strings so Tailwind sees
// them, and `plainButton.test.ts` compares them with the Nuxt UI theme so they cannot drift.
// A `UButton` instance costs a theme proxy, a tailwind-variants call and a class merge on every
// render, which adds up in the header and on the cards of a throttled phone.
const base =
  'rounded-md font-medium inline-flex items-center disabled:cursor-not-allowed aria-disabled:cursor-not-allowed disabled:opacity-75 aria-disabled:opacity-75 transition-colors';

const sizes: Record<PlainButtonSize, { text: string; padding: string; square: string }> = {
  sm: { text: 'text-xs gap-1.5', padding: 'px-2.5 py-1.5', square: 'p-1.5' },
  md: { text: 'text-sm gap-1.5', padding: 'px-2.5 py-1.5', square: 'p-1.5' },
  lg: { text: 'text-sm gap-2', padding: 'px-3 py-2', square: 'p-2' },
};

const variants: Record<PlainButtonVariant, string> = {
  ghost:
    'text-default hover:bg-elevated active:bg-elevated outline-inverted/25 focus-visible:outline-3 hover:disabled:bg-transparent dark:hover:disabled:bg-transparent hover:aria-disabled:bg-transparent dark:hover:aria-disabled:bg-transparent',
  subtle:
    'ring ring-inset ring-accented text-default bg-elevated hover:bg-accented/75 active:bg-accented/75 disabled:bg-elevated aria-disabled:bg-elevated outline-inverted/25 focus-visible:outline-3 focus-visible:ring-inverted',
  solid:
    'text-inverted bg-primary hover:bg-primary/75 active:bg-primary/75 disabled:bg-primary aria-disabled:bg-primary outline-primary/25 focus-visible:outline-3',
};

export const plainButtonClasses = (
  variant: PlainButtonVariant,
  size: PlainButtonSize,
  square: boolean,
): string => {
  const { text, padding, square: squarePadding } = sizes[size];
  return [base, square ? squarePadding : padding, text, variants[variant]].join(' ');
};
