/* eslint-disable @typescript-eslint/explicit-function-return-type --
   The return type is the (large) inferred useAsyncData AsyncData type. */

// The plants to water today. One shared query: the home page starts it as soon as it mounts, in
// parallel with the sign-in check, instead of waiting for the answer of `me` and for the band
// to mount (two round trips one after the other). `dedupe: 'defer'` makes the band reuse the
// request already in flight rather than cancel it.
export const usePlantsDue = () =>
  useQuery('plants-due', () => GqlPlantsDue(), { server: false, dedupe: 'defer' });
