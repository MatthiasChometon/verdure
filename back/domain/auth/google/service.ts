import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type AxiosResponse, isAxiosError } from 'axios';
import { firstValueFrom, type Observable } from 'rxjs';
import { GoogleProfile } from '../../user/type';
import {
  retryTransient,
  type RetryOptions,
  transientAxiosFailure,
} from '../../../infrastructure/http/retry';
import type { TokenResponse, UserinfoResponse } from './type';

const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';
// A refusal that says "try again later" rather than "your code is wrong".
const RETRYABLE = new Set([408, 429]);
const UNAVAILABLE_MESSAGE =
  'Google could not be reached. Try again in a moment.';

@Injectable()
export class GoogleOAuth {
  private readonly logger = new Logger(GoogleOAuth.name);

  // Left alone in production; a test pins the jitter and skips the waiting.
  retryOptions: Partial<RetryOptions> = {};

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  authorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      redirect_uri: this.config.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'online',
      prompt: 'select_account',
    });
    return `${AUTHORIZE_URL}?${params.toString()}`;
  }

  async fetchProfile(code: string): Promise<GoogleProfile> {
    const accessToken = await this.exchangeCode(code);
    const profile = await this.fetchUserinfo(accessToken);

    // The account is keyed on the email, so only an address Google vouches for
    // may link to (or create) one.
    if (
      typeof profile.sub !== 'string' ||
      typeof profile.email !== 'string' ||
      profile.email_verified !== true
    ) {
      throw new UnauthorizedException('Google has not confirmed that address.');
    }

    return {
      googleId: profile.sub,
      email: profile.email,
      name: profile.name ?? profile.email,
      avatarUrl: profile.picture ?? null,
    };
  }

  private async exchangeCode(code: string): Promise<string> {
    const body = new URLSearchParams({
      code,
      client_id: this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      client_secret: this.config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      redirect_uri: this.config.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
      grant_type: 'authorization_code',
    });
    const data = await this.call(
      () =>
        this.http.post<TokenResponse>(TOKEN_URL, body, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      'Failed to exchange the authorization code.',
    );
    return this.accessTokenOf(data);
  }

  private fetchUserinfo(accessToken: string): Promise<UserinfoResponse> {
    // Reading a profile has no effect, so asking again is safe. The code
    // exchange is not retried: an authorisation code is single-use.
    return this.call(
      () =>
        this.http.get<UserinfoResponse>(USERINFO_URL, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      'Failed to fetch the Google profile.',
      true,
    );
  }

  private async call<T>(
    request: () => Observable<AxiosResponse<T>>,
    failureMessage: string,
    isIdempotent = false,
  ): Promise<T> {
    try {
      const send = (): Promise<AxiosResponse<T>> => firstValueFrom(request());
      const { data } = isIdempotent
        ? await retryTransient(send, transientAxiosFailure, this.retryOptions)
        : await send();
      return data;
    } catch (error) {
      throw this.toHttpException(error, failureMessage);
    }
  }

  // The answer of Google is external data: a 200 without a usable token is
  // Google misbehaving, not a bad code.
  private accessTokenOf(data: TokenResponse): string {
    if (typeof data.access_token !== 'string' || data.access_token === '') {
      throw new ServiceUnavailableException(UNAVAILABLE_MESSAGE);
    }
    return data.access_token;
  }

  // Google refusing the request (4xx other than 408 and 429) means the code or
  // token is bad: 401. Google failing (5xx), timing out (408), rate limiting
  // (429) or being unreachable is not the caller's fault: 503, logged with the
  // status or code only (never the URL, which can carry the authorisation
  // code). Anything that is not an HTTP failure is a bug: logged with its cause
  // and rethrown as it was.
  private toHttpException(error: unknown, message: string): Error {
    if (!isAxiosError(error)) {
      this.logger.error(
        message,
        error instanceof Error ? error.stack : String(error),
      );
      return error instanceof Error
        ? error
        : new Error(message, { cause: error });
    }
    const status = error.response?.status;
    if (status !== undefined && !RETRYABLE.has(status) && status < 500) {
      return new UnauthorizedException(message);
    }
    this.logger.warn(
      `Google unreachable or failing: ${status ?? error.code ?? 'unknown'}`,
    );
    return new ServiceUnavailableException(UNAVAILABLE_MESSAGE);
  }
}
