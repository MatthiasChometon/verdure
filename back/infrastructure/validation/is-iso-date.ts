import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// We exchange dates as ISO strings (YYYY-MM-DD) on the wire, so this constraint
// is reused across every input that carries a calendar date.
@ValidatorConstraint({ name: 'isIsoDate' })
export class IsIsoDateConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && ISO_DATE.test(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be an ISO date (YYYY-MM-DD).`;
  }
}

export const IsIsoDate =
  (options?: ValidationOptions) =>
  (object: object, propertyName: string): void => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      validator: IsIsoDateConstraint,
    });
  };
