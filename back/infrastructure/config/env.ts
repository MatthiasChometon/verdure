export const DEFAULT_PORT = 3000;

// The value the compose files and `.env.example` ship for local use. It is public
// (it sits in this repository), so a server that signs sessions with it lets
// anyone mint a valid cookie.
export const PLACEHOLDER_JWT_SECRET = 'dev-jwt-secret-change-in-prod';

type RawEnvironment = Record<string, unknown>;

const isBlank = (value: unknown): boolean =>
  typeof value !== 'string' || value.trim() === '';

const isPort = (value: string): boolean => {
  const port = Number(value);
  return Number.isInteger(port) && port > 0 && port <= 65_535;
};

const isProduction = (raw: RawEnvironment): boolean =>
  raw.NODE_ENV === 'production';

// What the modules already read with `getOrThrow` while the app is built: listed
// here so a bad deployment gets every missing name at once, before anything is
// wired, instead of the first one Nest happens to meet. Variables that only one
// feature needs (Google, push, Pl@ntNet) stay optional on purpose: leaving them
// empty is how that feature is switched off.
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

const missingRequired = (raw: RawEnvironment): string[] =>
  requiredNames(raw)
    .filter((name): boolean => isBlank(raw[name]))
    .map((name): string => `${name} is required`);

// A port that is set but not a port only fails later, far from its cause (a mail
// transport on port NaN), so it is refused here.
const malformedMailPort = (raw: RawEnvironment): string[] =>
  !isBlank(raw.MAIL_PORT) && !isPort(String(raw.MAIL_PORT).trim())
    ? ['MAIL_PORT must be a TCP port']
    : [];

const placeholderSecretInProduction = (raw: RawEnvironment): string[] =>
  isProduction(raw) && raw.JWT_SECRET === PLACEHOLDER_JWT_SECRET
    ? ['JWT_SECRET must not be the placeholder shipped with the repository']
    : [];

// Run by bootstrap before anything is built, so a missing secret stops the
// process at boot with every problem listed. Values are never echoed: they may
// be secrets. It is not wired through `ConfigModule`'s `validate` hook on
// purpose: that one validates a copy taken when the module loads, and
// `ConfigService` would then read that copy instead of the live `process.env`.
export const validateEnvironment = (raw: RawEnvironment): void => {
  const problems = [
    ...missingRequired(raw),
    ...malformedMailPort(raw),
    ...placeholderSecretInProduction(raw),
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
