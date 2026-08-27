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

  // Set when the front and API live on sibling subdomains of one registrable
  // domain (app.example.com + api.example.com): the cookie is issued for the
  // parent domain, first-party for the whole site. Safari keeps it (not a
  // third-party cookie) and it stays httpOnly — the recommended BFF/same-site
  // setup. Takes precedence over the cross-site fallback.
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
