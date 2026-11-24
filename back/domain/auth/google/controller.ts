import { randomUUID } from 'node:crypto';
import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { SessionCookie } from '../currentUser/cookie';
import { AuthService } from '../service';
import { GoogleCallbackInput } from './input';
import { isExpectedState } from './state';

type GoogleCallbackQuery = Pick<GoogleCallbackInput, 'code' | 'state'>;

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
    // Google adds parameters of its own (scope, authuser, prompt...), which the
    // app-wide pipe would refuse. The parameter is typed as a plain object so
    // that pipe skips it, and this pipe validates it against the DTO instead,
    // dropping the extras.
    @Query(
      new ValidationPipe({
        expectedType: GoogleCallbackInput,
        whitelist: true,
        transform: true,
      }),
    )
    { code, state }: GoogleCallbackQuery,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    // Cleared whatever happens next: the state is good for one attempt, and a
    // failed one must not leave it lying around for another.
    reply.clearCookie(this.cookie.state, this.cookie.clearOptions());

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
