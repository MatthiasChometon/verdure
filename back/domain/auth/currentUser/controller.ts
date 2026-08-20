import { Controller, Post, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { SessionCookie } from './cookie';

@Controller('auth')
export class LogoutController {
  constructor(private readonly cookie: SessionCookie) {}

  @Post('logout')
  logout(@Res() reply: FastifyReply): void {
    reply.clearCookie(this.cookie.token, this.cookie.clearOptions());
    reply.send({ success: true });
  }
}
