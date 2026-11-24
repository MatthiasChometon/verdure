/* eslint-disable */
// @ts-nocheck
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

const oauthWith = (
  http: Partial<Record<'post' | 'get', unknown>>,
): GoogleOAuth => new GoogleOAuth(http as HttpService, config);

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
