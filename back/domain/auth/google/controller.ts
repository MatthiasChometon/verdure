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

const STATE_MAX_AGE = 10 * 60;

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
    reply.setCookie(this.cookie.state, state, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: STATE_MAX_AGE,
    });
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
    reply.clearCookie(this.cookie.state, { path: '/' });
    reply.setCookie(this.cookie.token, token, this.cookie.tokenOptions());
    reply.status(302).redirect(this.config.getOrThrow<string>('FRONT_URL'));
  }
}
