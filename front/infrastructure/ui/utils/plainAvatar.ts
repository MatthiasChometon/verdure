// Static class lists equal to what Nuxt UI's `UAvatar` resolves for the default (neutral) colour at
// size `sm`, the only avatar drawn at startup (the header's account button). `plainAvatar.test.ts`
// compares them with the Nuxt UI theme so they cannot drift.
export const plainAvatarClasses = {
  root: 'inline-flex items-center justify-center shrink-0 select-none rounded-full align-middle bg-elevated size-7 text-sm',
  image: 'h-full w-full rounded-[inherit] object-cover',
  fallback: 'font-medium truncate text-muted',
} as const;

// What `UAvatar` shows without an image: the first letters of the words of the name, at most two.
// A non-breaking space keeps the circle's line box when the name is empty.
export const avatarInitials = (name: string): string =>
  name
    .split(' ')
    .map((word) => word.charAt(0))
    .join('')
    .substring(0, 2) || ' ';
