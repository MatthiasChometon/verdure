// Mirrors the back's CareConstraints so the form's bounds match what the API
// accepts: at least daily, at most a ten-year cycle.
export const useCareConstraints = (): {
  minIntervalDays: number;
  maxIntervalDays: number;
} => ({
  minIntervalDays: 1,
  maxIntervalDays: 3650,
});
