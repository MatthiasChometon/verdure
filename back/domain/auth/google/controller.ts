import { randomUUID } from 'node:crypto';
import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { SessionCookie } from '../currentUser/cookie';
import { AuthService } from '../service';
import { ClearStateCookieInterceptor } from './clear-state.interceptor';
import { PlainTextPipe } from './plain-text.pipe';
import { isExpectedState } from './state';

@Controller('auth')
export class GoogleController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
    private readonly cookie: SessionCookie,
  ) {}

  @Get('google')
  google(@Res() reply: FastifyReply): void {
    const state = randomUUID();
    reply.setCookie(this.cookie.state, state, this.cookie.stateOptions());
    reply.status(302).redirect(this.auth.authorizationUrl(state));
  }

  // Google adds parameters of its own (scope, authuser, prompt...), which the
  // app-wide strict pipe would refuse as a DTO: only the two named parameters are
  // read, each as plain text. The state cookie is cleared before anything can
  // refuse the request, so every outcome leaves none behind.
  @Get('google/callback')
  @UseInterceptors(ClearStateCookieInterceptor)
  async googleCallback(
    @Query('code', PlainTextPipe) code: string | undefined,
    @Query('state', PlainTextPipe) state: string | undefined,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const savedState = request.cookies?.[this.cookie.state];
    if (
      code === undefined ||
      state === undefined ||
      !isExpectedState(state, savedState)
    ) {
      throw new UnauthorizedException('Invalid OAuth state.');
    }

    const token = await this.auth.signIn(code);
    reply.setCookie(this.cookie.token, token, this.cookie.tokenOptions());
    reply.status(302).redirect(this.frontUrlFor(request));
  }

  // Cross-site or subdomain setup: straight to FRONT_URL. Pure same-host (LAN/
  // localhost) mirrors the host that reached the API, never the api.* subdomain.
  private frontUrlFor(request: FastifyRequest): string {
    const front = new URL(this.config.getOrThrow<string>('FRONT_URL'));
    if (this.cookie.crossSite || this.cookie.domain !== undefined) {
      return front.toString();
    }
    const [host = ''] = (request.headers.host ?? '').split(':');
    if (host !== '') {
      front.hostname = host;
    }
    return front.toString();
  }
}
