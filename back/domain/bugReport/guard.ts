import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { RequestContext } from '../auth/currentUser/request-context';
import { Admins } from './admins.service';

// Must run after AuthGuard in @UseGuards — it needs the user already on the request.
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly admins: Admins) {}

  canActivate(context: ExecutionContext): boolean {
    const user = RequestContext.from(context).user;

    // Forbidden, not not-found: the caller is already signed in, so hiding the
    // route would only be security by obscurity.
    if (user === undefined || !this.admins.has(user.email)) {
      throw new ForbiddenException('This account is not an administrator.');
    }

    return true;
  }
}
