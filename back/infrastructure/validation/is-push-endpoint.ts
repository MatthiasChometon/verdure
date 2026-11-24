import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

// The push services behind the browsers' Push API. The server POSTs to a stored
// endpoint on its own, so an endpoint the client could point anywhere would let
// any signed-in user make it call internal addresses (SSRF). Only these hosts
// (and their subdomains) are ever called.
const PUSH_SERVICE_DOMAINS = [
  'fcm.googleapis.com', // Chrome, Edge, Brave, Opera, Samsung Internet
  'push.services.mozilla.com', // Firefox
  'push.apple.com', // Safari, iOS web apps
  'notify.windows.com', // legacy Edge
];

export const isPushEndpoint = (value: unknown): boolean => {
  if (typeof value !== 'string') {
    return false;
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  const host = url.hostname;
  return (
    url.protocol === 'https:' &&
    url.username === '' &&
    url.password === '' &&
    (url.port === '' || url.port === '443') &&
    PUSH_SERVICE_DOMAINS.some(
      (domain) => host === domain || host.endsWith(`.${domain}`),
    )
  );
};

@ValidatorConstraint({ name: 'isPushEndpoint' })
export class IsPushEndpointConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return isPushEndpoint(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be an https endpoint of a known push service.`;
  }
}

export const IsPushEndpoint =
  (options?: ValidationOptions) =>
  (object: object, propertyName: string): void => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      validator: IsPushEndpointConstraint,
    });
  };
