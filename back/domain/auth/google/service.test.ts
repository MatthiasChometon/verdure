import { HttpService } from '@nestjs/axios';
import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AxiosError, type AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';
import { GOOGLE_TIMEOUT_MS, googleHttpModule } from './http';
import { GoogleOAuth } from './service';
import type { UserinfoResponse } from './type';

const config = {
  getOrThrow: (key: string) => `value-of-${key}`,
} as unknown as ConfigService;

const response = <T>(data: T): AxiosResponse<T> =>
  ({ data, status: 200 }) as AxiosResponse<T>;

const failure = (status: number | undefined, code?: string): AxiosError =>
  new AxiosError(
    'request failed',
    code,
    undefined,
    undefined,
    status === undefined ? undefined : ({ status, data: {} } as AxiosResponse),
  );

const verifiedUserinfo: UserinfoResponse = {
  sub: 'google-1',
  email: 'alice@test.dev',
  email_verified: true,
  name: 'Alice',
  picture: 'https://pics.test/alice.png',
};

const sleeps: number[] = [];

const oauthWith = (
  http: Partial<Record<'post' | 'get', unknown>>,
): GoogleOAuth => {
  const oauth = new GoogleOAuth(http as HttpService, config);
  // Pinned jitter, and no real waiting between attempts.
  oauth.retryOptions = {
    random: () => 0.5,
    sleep: (ms: number): Promise<void> => {
      sleeps.push(ms);
      return Promise.resolve();
    },
  };
  return oauth;
};

beforeEach(() => {
  sleeps.length = 0;
});

const happyHttp = (
  userinfo: UserinfoResponse,
): Record<string, () => unknown> => ({
  post: () => of(response({ access_token: 'access' })),
  get: () => of(response(userinfo)),
});

describe('GoogleOAuth.fetchProfile', () => {
  it('returns the profile of a verified Google account', async () => {
    const oauth = oauthWith(happyHttp(verifiedUserinfo));

    await expect(oauth.fetchProfile('code')).resolves.toEqual({
      googleId: 'google-1',
      email: 'alice@test.dev',
      name: 'Alice',
      avatarUrl: 'https://pics.test/alice.png',
    });
  });

  it('refuses an address Google has not verified', async () => {
    const oauth = oauthWith(
      happyHttp({ ...verifiedUserinfo, email_verified: false }),
    );

    await expect(oauth.fetchProfile('code')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('refuses a userinfo answer without the verification flag', async () => {
    const unflagged: UserinfoResponse = {
      ...verifiedUserinfo,
      email_verified: undefined,
    };
    const oauth = oauthWith(happyHttp(unflagged));

    await expect(oauth.fetchProfile('code')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('falls back to the email when Google sends no name', async () => {
    const nameless: UserinfoResponse = { ...verifiedUserinfo, name: undefined };
    const oauth = oauthWith(happyHttp(nameless));

    await expect(oauth.fetchProfile('code')).resolves.toMatchObject({
      name: 'alice@test.dev',
    });
  });

  it.each([400, 401, 403])(
    'answers 401 when Google rejects the authorization code with %i',
    async (status) => {
      const oauth = oauthWith({
        post: () => throwError(() => failure(status)),
      });

      await expect(oauth.fetchProfile('bad')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    },
  );

  it.each([undefined, '', 42])(
    'answers 503 when Google sends no usable access token (%s)',
    async (token) => {
      const oauth = oauthWith({
        post: () => of(response({ access_token: token })),
      });

      await expect(oauth.fetchProfile('code')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    },
  );

  it.each([
    ['a timeout', failure(undefined, 'ECONNABORTED')],
    ['an unreachable host', failure(undefined, 'ENOTFOUND')],
    ['a Google outage', failure(503)],
    ['a request timeout answer', failure(408)],
    ['a rate limit answer', failure(429)],
  ])('answers 503 on %s while exchanging the code', async (_case, error) => {
    const oauth = oauthWith({ post: () => throwError(() => error) });

    await expect(oauth.fetchProfile('code')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('answers 503 when the userinfo call times out', async () => {
    const oauth = oauthWith({
      post: () => of(response({ access_token: 'access' })),
      get: () => throwError(() => failure(undefined, 'ECONNABORTED')),
    });

    await expect(oauth.fetchProfile('code')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('lets a non-HTTP error through instead of disguising it', async () => {
    const bug = new TypeError('a bug of ours');
    const oauth = oauthWith({ post: () => throwError(() => bug) });

    await expect(oauth.fetchProfile('code')).rejects.toBe(bug);
  });
});

describe('retrying the profile read', () => {
  const replied = (
    status: number,
    headers: Record<string, string> = {},
  ): AxiosError =>
    new AxiosError('failed', String(status), undefined, undefined, {
      status,
      headers,
    } as never);

  // The token exchange always works; the profile read fails as many times as told.
  const readingAfter = (
    failures: unknown[],
  ): { oauth: GoogleOAuth; gets: () => number } => {
    let gets = 0;
    const oauth = oauthWith({
      post: () => of(response({ access_token: 'access' })),
      get: () => {
        const next = failures[gets];
        gets += 1;
        return next === undefined
          ? of(response(verifiedUserinfo))
          : throwError(() => next);
      },
    });
    return { oauth, gets: () => gets };
  };

  it('asks again after a timeout and signs the reader in', async () => {
    const { oauth } = readingAfter([failure(undefined, 'ECONNABORTED')]);

    await expect(oauth.fetchProfile('code')).resolves.toMatchObject({
      email: 'alice@test.dev',
    });
    expect(sleeps).toEqual([100]);
  });

  it('waits what Google asks for through Retry-After', async () => {
    const { oauth } = readingAfter([replied(429, { 'retry-after': '1' })]);

    await oauth.fetchProfile('code');

    expect(sleeps).toEqual([1000]);
  });

  it('gives up after three attempts and answers 503', async () => {
    const { oauth, gets } = readingAfter([
      replied(503),
      replied(503),
      replied(503),
      replied(503),
    ]);

    await expect(oauth.fetchProfile('code')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(gets()).toBe(3);
  });

  it.each([400, 401, 403, 500])(
    'does not ask again after a %i',
    async (status) => {
      const { oauth, gets } = readingAfter([replied(status), replied(status)]);

      await expect(oauth.fetchProfile('code')).rejects.toBeInstanceOf(Error);
      expect(gets()).toBe(1);
    },
  );

  it('never asks twice for the single-use code', async () => {
    let posts = 0;
    const oauth = oauthWith({
      post: () => {
        posts += 1;
        return throwError(() => failure(undefined, 'ECONNABORTED'));
      },
    });

    await expect(oauth.fetchProfile('code')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(posts).toBe(1);
  });
});

describe('googleHttpModule', () => {
  it('caps every call to Google at the timeout', async () => {
    const module = await Test.createTestingModule({
      imports: [googleHttpModule],
    }).compile();

    expect(module.get(HttpService).axiosRef.defaults.timeout).toBe(
      GOOGLE_TIMEOUT_MS,
    );
  });
});
