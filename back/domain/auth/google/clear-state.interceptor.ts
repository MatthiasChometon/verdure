import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import type { Observable } from 'rxjs';
import { SessionCookie } from '../currentUser/cookie';

// Interceptors run before the parameter pipes: the one-attempt state cookie is
// cleared even when a pipe refuses the request (a repeated `state` gives 400).
@Injectable()
export class ClearStateCookieInterceptor implements NestInterceptor {
  constructor(private readonly cookie: SessionCookie) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const reply = context.switchToHttp().getResponse<FastifyReply>();
    reply.clearCookie(this.cookie.state, this.cookie.clearOptions());
    return next.handle();
  }
}
