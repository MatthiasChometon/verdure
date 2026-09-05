import { HttpService } from '@nestjs/axios';
import { Injectable, UnauthorizedException } from '@nestjs/common';
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

    return {
      googleId: profile.sub,
      email: profile.email,
      name: profile.name,
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

  // A non-2xx response maps to "unauthorized"; a network-level failure (no
  // response at all) is not a client error, so it bubbles up unchanged.
  private toUnauthorized(error: unknown, message: string): Error {
    if (isAxiosError(error) && error.response !== undefined) {
      return new UnauthorizedException(message);
    }
    return error instanceof Error ? error : new Error(String(error));
  }
}
