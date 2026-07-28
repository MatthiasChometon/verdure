import { Injectable } from '@nestjs/common';
import { TokenCookieOptions } from './type';

const TOKEN_MAX_AGE = 7 * 24 * 60 * 60;

// Names and serialisation options for the auth cookies, in one place so the
// guard, resolver and controllers all agree on them.
@Injectable()
export class SessionCookie {
  readonly token = 'auth_token';
  readonly state = 'oauth_state';

  tokenOptions(): TokenCookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
      maxAge: TOKEN_MAX_AGE,
    };
  }
}
