import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleProfile } from '../../user/type';
import { TokenResponse, UserinfoResponse } from './type';

const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

@Injectable()
export class GoogleOAuth {
  constructor(private readonly config: ConfigService) {}

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
    const tokenResponse = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
        client_secret: this.config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
        redirect_uri: this.config.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenResponse.ok) {
      throw new UnauthorizedException(
        'Failed to exchange the authorization code.',
      );
    }
    const { access_token: accessToken } =
      (await tokenResponse.json()) as TokenResponse;

    const userinfoResponse = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!userinfoResponse.ok) {
      throw new UnauthorizedException('Failed to fetch the Google profile.');
    }
    const profile = (await userinfoResponse.json()) as UserinfoResponse;

    return {
      googleId: profile.sub,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.picture ?? null,
    };
  }
}
