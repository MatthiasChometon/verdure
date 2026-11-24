import type { ConfigService } from '@nestjs/config';

export const DEFAULT_PORT = 3000;

// The value the compose files ship for local use. It is public (it sits in this
// repository), so a server that signs sessions with it lets anyone mint a valid
// cookie.
export const PLACEHOLDER_JWT_SECRET = 'dev-jwt-secret-change-in-prod';

// Shorter than this is guessable by brute force; `openssl rand -hex 32` gives 64.
export const MIN_JWT_SECRET_LENGTH = 32;

type RawEnvironment = Record<string, unknown>;

// `deployed` is true on the real deployment (under Passenger, the same signal
// main.ts uses), not on NODE_ENV: the local prod-like compose stacks run with
// NODE_ENV=production and a throwaway secret on purpose.
type Options = { deployed: boolean };

const isBlank = (value: unknown): boolean =>
  typeof value !== 'string' || value.trim() === '';

const isPort = (value: string): boolean => {
  const port = Number(value);
  return Number.isInteger(port) && port > 0 && port <= 65_535;
};

// What the modules already read with `getOrThrow` while the app is built: listed
// here so a bad deployment gets every missing name at once, before anything is
// wired, instead of the first one Nest happens to meet. Variables that only one
// feature needs (Google, Pl@ntNet) stay optional on purpose: leaving them empty
// is how that feature is switched off.
const requiredNames = (raw: RawEnvironment): string[] => [
  'DATABASE_URL',
  'JWT_SECRET',
  'MAIL_HOST',
  'MAIL_FROM',
  // The `ethereal` test inbox brings its own port.
  ...(raw.MAIL_HOST === 'ethereal' ? [] : ['MAIL_PORT']),
  ...(raw.STORAGE_DRIVER === 's3'
    ? [
        'S3_ENDPOINT',
        'S3_REGION',
        'S3_BUCKET',
        'S3_ACCESS_KEY',
        'S3_SECRET_KEY',
      ]
    : []),
];

// Same rule as `getOrThrow` (unset), plus the two values that cannot work empty:
// the connection string and the signing secret.
const NEVER_EMPTY = new Set(['DATABASE_URL', 'JWT_SECRET']);

const missingRequired = (raw: RawEnvironment): string[] =>
  requiredNames(raw)
    .filter((name): boolean =>
      NEVER_EMPTY.has(name) ? isBlank(raw[name]) : raw[name] === undefined,
    )
    .map((name): string => `${name} is required`);

// A port that is set but not a port only fails later, far from its cause (a mail
// transport on port NaN), so it is refused here.
const malformedMailPort = (raw: RawEnvironment): string[] =>
  !isBlank(raw.MAIL_PORT) && !isPort(String(raw.MAIL_PORT).trim())
    ? ['MAIL_PORT must be a TCP port']
    : [];

// Tuning knobs left unset in normal use. A typo ("30 per day", "0") used to fall
// back to the default silently through `Number(...) || default`; now it stops the boot.
const OPTIONAL_POSITIVE_INTEGERS = [
  'PLANTNET_SHARED_DAILY_LIMIT',
  'AI_WORKER_LONG_POLL_MS',
  'AI_WORKER_POLL_INTERVAL_MS',
];

const isPositiveInteger = (value: string): boolean => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0;
};

const malformedPositiveIntegers = (raw: RawEnvironment): string[] =>
  OPTIONAL_POSITIVE_INTEGERS.filter(
    (name) =>
      !isBlank(raw[name]) && !isPositiveInteger(String(raw[name]).trim()),
  ).map((name): string => `${name} must be a positive integer`);

// One key without the other is a half-configured push: the service would start
// with push silently off, which nobody asked for.
const halfConfiguredPush = (raw: RawEnvironment): string[] =>
  isBlank(raw.VAPID_PUBLIC_KEY) !== isBlank(raw.VAPID_PRIVATE_KEY)
    ? ['VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be set together']
    : [];

const weakSecretWhenDeployed = (
  raw: RawEnvironment,
  { deployed }: Options,
): string[] => {
  const secret = raw.JWT_SECRET;
  if (!deployed || typeof secret !== 'string' || secret.trim() === '') {
    return [];
  }
  if (secret === PLACEHOLDER_JWT_SECRET) {
    return [
      'JWT_SECRET must not be the placeholder shipped with the repository',
    ];
  }

  return secret.length < MIN_JWT_SECRET_LENGTH
    ? [`JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters`]
    : [];
};

// Run by bootstrap before anything is built, and by the deploy script before it
// restarts the app, so a bad .env stops there with every problem listed. Values
// are never echoed: they may be secrets. It is not wired through
// `ConfigModule`'s `validate` hook on purpose: that one validates a copy taken
// when the module loads, and `ConfigService` would then read that copy instead
// of the live `process.env`.
export const validateEnvironment = (
  raw: RawEnvironment,
  options: Options = { deployed: false },
): void => {
  const problems = [
    ...missingRequired(raw),
    ...malformedMailPort(raw),
    ...malformedPositiveIntegers(raw),
    ...halfConfiguredPush(raw),
    ...weakSecretWhenDeployed(raw, options),
  ];

  if (problems.length > 0) {
    throw new Error(`Invalid environment: ${problems.join('; ')}.`);
  }
};

// Read only where a port is actually bound: under Passenger the host hands the
// process its socket and PORT is never looked at, so whatever it set must not
// stop the boot.
export const listenPort = (raw: RawEnvironment): number => {
  if (isBlank(raw.PORT)) return DEFAULT_PORT;
  if (!isPort(String(raw.PORT).trim())) {
    throw new Error('Invalid environment: PORT must be a TCP port.');
  }

  return Number(raw.PORT);
};

// The value of a setting listed in OPTIONAL_POSITIVE_INTEGERS, or its default
// when unset: boot has already refused any other shape.
export const positiveIntegerSetting = (
  config: ConfigService,
  name: string,
  fallback: number,
): number => {
  const raw = config.get<string>(name);
  return raw === undefined || raw.trim() === '' ? fallback : Number(raw);
};
