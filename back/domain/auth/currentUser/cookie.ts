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

  // Cross-domain front/API (e.g. Netlify+o2switch) need SameSite=None; Secure to
  // send/store the cookie; same-host deploys keep Lax (works over plain LAN http).
  readonly crossSite: boolean;

  // Sibling subdomains of one registrable domain: cookie issued for the parent
  // domain, first-party (Safari keeps it). Takes precedence over crossSite.
  readonly domain: string | undefined;

  constructor(config: ConfigService) {
    this.crossSite = config.get<string>('CROSS_SITE_COOKIES') === 'true';
    this.domain = config.get<string>('COOKIE_DOMAIN') || undefined;
  }

  tokenOptions(): TokenCookieOptions {
    return { ...this.base(), maxAge: TOKEN_MAX_AGE };
  }

  stateOptions(): TokenCookieOptions {
    return { ...this.base(), maxAge: STATE_MAX_AGE };
  }

  // Clearing a cookie only removes it when SameSite/Secure/Path match how it was
  // set — otherwise a SameSite=None; Secure cookie survives the logout.
  clearOptions(): Omit<TokenCookieOptions, 'maxAge'> {
    return this.base();
  }

  private base(): Omit<TokenCookieOptions, 'maxAge'> {
    // Same-site across subdomains: SameSite=Lax; Secure, scoped to the shared
    // parent domain. First-party for both the app and the api subdomain.
    if (this.domain !== undefined) {
      return {
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
        path: '/',
        domain: this.domain,
      };
    }
    return {
      httpOnly: true,
      sameSite: this.crossSite ? 'none' : 'lax',
      secure: this.crossSite,
      path: '/',
    };
  }
}
