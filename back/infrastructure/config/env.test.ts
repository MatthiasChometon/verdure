import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PORT,
  listenPort,
  MIN_JWT_SECRET_LENGTH,
  PLACEHOLDER_JWT_SECRET,
  validateEnvironment,
} from './env';

const valid = {
  DATABASE_URL: 'postgres://verdure@localhost/verdure',
  JWT_SECRET: 'a-secret',
  MAIL_HOST: 'localhost',
  MAIL_PORT: '1025',
  MAIL_FROM: 'verdure <noreply@verdure.local>',
};

const deployed = { deployed: true };

describe('the environment check made at boot', () => {
  it('accepts the variables the modules cannot start without', () => {
    expect(() => validateEnvironment(valid)).not.toThrow();
  });

  it.each(['DATABASE_URL', 'JWT_SECRET'])(
    'refuses to boot with %s empty',
    (name) => {
      expect(() => validateEnvironment({ ...valid, [name]: '  ' })).toThrow(
        `${name} is required`,
      );
    },
  );

  it.each(['MAIL_HOST', 'MAIL_FROM', 'MAIL_PORT'])(
    'refuses to boot without %s, as getOrThrow does',
    (name) => {
      expect(() =>
        validateEnvironment({ ...valid, [name]: undefined }),
      ).toThrow(`${name} is required`);
    },
  );

  it('does not ask for a mail port when the test inbox is used', () => {
    const environment = {
      ...valid,
      MAIL_HOST: 'ethereal',
      MAIL_PORT: undefined,
    };

    expect(() => validateEnvironment(environment)).not.toThrow();
  });

  it('asks for the bucket settings only with the S3 driver', () => {
    expect(() =>
      validateEnvironment({ ...valid, STORAGE_DRIVER: 'disk' }),
    ).not.toThrow();
    expect(() =>
      validateEnvironment({ ...valid, STORAGE_DRIVER: 's3' }),
    ).toThrow('S3_ENDPOINT is required');
  });

  it('refuses a mail port that is not a port', () => {
    expect(() => validateEnvironment({ ...valid, MAIL_PORT: '4.5' })).toThrow(
      'MAIL_PORT must be a TCP port',
    );
  });

  it('does not look at PORT, which the host owns under Passenger', () => {
    expect(() =>
      validateEnvironment({ ...valid, PORT: 'passenger' }),
    ).not.toThrow();
  });

  it('refuses one VAPID key without the other', () => {
    expect(() =>
      validateEnvironment({ ...valid, VAPID_PUBLIC_KEY: 'public' }),
    ).toThrow('VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be set together');
    expect(() =>
      validateEnvironment({
        ...valid,
        VAPID_PUBLIC_KEY: 'public',
        VAPID_PRIVATE_KEY: 'private',
      }),
    ).not.toThrow();
  });

  it('lists every problem at once, never a value', () => {
    const attempt = (): unknown =>
      validateEnvironment({
        ...valid,
        DATABASE_URL: '',
        JWT_SECRET: '',
        MAIL_PORT: 'hunter2',
      });

    expect(attempt).toThrow(
      /DATABASE_URL is required; JWT_SECRET is required; MAIL_PORT must be/,
    );
    expect(attempt).not.toThrow(/hunter2/);
  });
});

describe('the secret check on the real deployment', () => {
  const strong = 'x'.repeat(MIN_JWT_SECRET_LENGTH);

  it('refuses the public placeholder, only there', () => {
    const placeholder = { ...valid, JWT_SECRET: PLACEHOLDER_JWT_SECRET };

    expect(() => validateEnvironment(placeholder)).not.toThrow();
    expect(() =>
      validateEnvironment({ ...placeholder, NODE_ENV: 'production' }),
    ).not.toThrow();
    expect(() => validateEnvironment(placeholder, deployed)).toThrow(
      'JWT_SECRET must not be the placeholder',
    );
  });

  it('refuses a secret under the length floor, only there', () => {
    const short = { ...valid, JWT_SECRET: strong.slice(1) };

    expect(() => validateEnvironment(short)).not.toThrow();
    expect(() => validateEnvironment(short, deployed)).toThrow(
      `at least ${MIN_JWT_SECRET_LENGTH} characters`,
    );
  });

  it('accepts a long random secret', () => {
    expect(() =>
      validateEnvironment({ ...valid, JWT_SECRET: strong }, deployed),
    ).not.toThrow();
  });
});

describe('the port the server listens on', () => {
  it('defaults when unset', () => {
    expect(listenPort({})).toBe(DEFAULT_PORT);
  });

  it('turns a configured port into a number', () => {
    expect(listenPort({ PORT: '4000' })).toBe(4000);
  });

  it.each(['abc', '70000'])('refuses %s', (value) => {
    expect(() => listenPort({ PORT: value })).toThrow(
      'PORT must be a TCP port',
    );
  });
});
