import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { GoogleProfile } from '../../user/type';
import type { TokenResponse, UserinfoResponse } from './type';

const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

@Injectable()
export class GoogleOAuth {
  private readonly logger = new Logger(GoogleOAuth.name);

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
    try {
      const { data } = await firstValueFrom(
        this.http.post<TokenResponse>(TOKEN_URL, body, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );
      return data.access_token;
    } catch (error) {
      throw this.toUnauthorized(
        error,
        'Failed to exchange the authorization code.',
      );
    }
  }

  private async fetchUserinfo(accessToken: string): Promise<UserinfoResponse> {
    try {
      const { data } = await firstValueFrom(
        this.http.get<UserinfoResponse>(USERINFO_URL, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      );
      return data;
    } catch (error) {
      throw this.toUnauthorized(error, 'Failed to fetch the Google profile.');
    }
  }

  // Google refusing the request (4xx) means the code or token is bad: 401.
  // Google failing (5xx), timing out or being unreachable is not the caller's
  // fault: 503, logged with the status or code only (never the URL, which can
  // carry the authorisation code). Anything else is a bug and bubbles up.
  private toUnauthorized(error: unknown, message: string): Error {
    if (!isAxiosError(error)) {
      return error instanceof Error ? error : new Error(String(error));
    }
    const status = error.response?.status;
    if (status !== undefined && status < 500) {
      return new UnauthorizedException(message);
    }
    this.logger.warn(
      `Google unreachable or failing: ${status ?? error.code ?? 'unknown'}`,
    );
    return new ServiceUnavailableException(
      'Google could not be reached. Try again in a moment.',
    );
  }
}
