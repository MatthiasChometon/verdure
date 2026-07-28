import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../service';
import { SessionCookie } from './cookie';
import { RequestContext } from './request-context';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly cookie: SessionCookie,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = RequestContext.from(context);

    const token = request.cookies?.[this.cookie.token];
    if (token === undefined) {
      throw new UnauthorizedException();
    }

    const user = await this.auth.userFromToken(token);
    if (user === undefined) {
      throw new UnauthorizedException();
    }

    request.user = user;
    return true;
  }
}
