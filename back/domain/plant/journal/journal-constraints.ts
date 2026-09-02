// Static so it can be used inside class-validator decorators (which run at class
// definition time and cannot inject a service).
export class JournalConstraints {
  static readonly noteMaxLength = 1000;
}
