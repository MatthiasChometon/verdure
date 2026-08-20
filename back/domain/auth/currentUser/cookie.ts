import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TokenCookieOptions } from './type';

const TOKEN_MAX_AGE = 7 * 24 * 60 * 60;
const STATE_MAX_AGE = 10 * 60;

// Names and serialisation options for the auth cookies, in one place so the
// guard, resolver and controllers all agree on them.
@Injectable()
export class SessionCookie {
  readonly token = 'auth_token';
  readonly state = 'oauth_state';

  // Cross-site when the front (e.g. Netlify) and the API (e.g. o2switch) sit on
  // different domains: the browser only sends the cookie on those XHRs, and only
  // stores it from the OAuth redirect, when it is SameSite=None; Secure. Same-host
  // deploys (local, LAN, Docker behind Caddy) keep Lax, which also works over
  // plain http on the LAN where Secure would drop the cookie.
  readonly crossSite: boolean;

  constructor(config: ConfigService) {
    this.crossSite = config.get<string>('CROSS_SITE_COOKIES') === 'true';
  }

  tokenOptions(): TokenCookieOptions {
    return { ...this.base(), maxAge: TOKEN_MAX_AGE };
  }

  stateOptions(): TokenCookieOptions {
    return { ...this.base(), maxAge: STATE_MAX_AGE };
  }

  private base(): Omit<TokenCookieOptions, 'maxAge'> {
    return {
      httpOnly: true,
      sameSite: this.crossSite ? 'none' : 'lax',
      secure: this.crossSite,
      path: '/',
    };
  }
}
