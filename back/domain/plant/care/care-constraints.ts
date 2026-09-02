// Static so it can be used inside class-validator decorators (which run at class
// definition time and cannot inject a service). One day at the fastest (daily
// misting); ten years at the slowest, comfortably covering a repotting cycle.
export class CareConstraints {
  static readonly minIntervalDays = 1;
  static readonly maxIntervalDays = 3650;
}
