// Static: consumed by class-validator decorators, which run at class-definition time and cannot inject a service.
export class CareConstraints {
  static readonly minIntervalDays = 1;
  static readonly maxIntervalDays = 3650;
}
