import { randomUUID } from 'node:crypto';
import {
  Controller,
  Get,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { SessionCookie } from '../currentUser/cookie';
import { AuthService } from '../service';

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

  @Get('google/callback')
  async googleCallback(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const query = request.query as { code?: string; state?: string };
    const savedState = request.cookies?.[this.cookie.state];

    if (
      query.code === undefined ||
      query.state === undefined ||
      query.state !== savedState
    ) {
      throw new UnauthorizedException('Invalid OAuth state.');
    }

    const token = await this.auth.signIn(query.code);
    reply.clearCookie(this.cookie.state, this.cookie.clearOptions());
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
    const host = (request.headers.host ?? '').split(':')[0];
    if (host !== '') {
      front.hostname = host;
    }
    return front.toString();
  }
}
