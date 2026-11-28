// Static so it can be used inside class-validator decorators (which run at class
// definition time and cannot inject a service).
export class PlantConstraints {
  static readonly nameMaxLength = 60;
  static readonly speciesMaxLength = 120;
  static readonly descriptionMaxLength = 500;
}
