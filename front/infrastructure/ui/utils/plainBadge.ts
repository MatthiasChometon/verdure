// Static class list equal to what Nuxt UI's `UBadge` resolves for `primary` + `soft` + `sm` (the only
// badge the app draws). `plainBadge.test.ts` compares it with the Nuxt UI theme so it cannot drift.
export const plainBadgeClasses =
  'font-medium inline-flex items-center text-[10px]/3 px-1.5 py-1 gap-1 rounded-sm bg-primary/10 text-primary';
