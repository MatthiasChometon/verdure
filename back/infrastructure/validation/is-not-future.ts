import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

// Format is IsIsoDate's job, so non-strings pass. Compared in UTC (YYYY-MM-DD
// strings sort chronologically), matching the watering schedule.
@ValidatorConstraint({ name: 'isNotFuture' })
export class IsNotFutureConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') {
      return true;
    }
    return value <= new Date().toISOString().slice(0, 10);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} cannot be in the future.`;
  }
}

export const IsNotFuture =
  (options?: ValidationOptions) =>
  (object: object, propertyName: string): void => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      validator: IsNotFutureConstraint,
    });
  };
