import { Body, Controller, Post, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { User } from '../../user/model';
import { SessionCookie } from '../currentUser/cookie';
import { AuthService } from '../service';
import {
  EmailInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  TokenInput,
} from './input';

@Controller('auth')
export class EmailPasswordController {
  constructor(
    private readonly auth: AuthService,
    private readonly cookie: SessionCookie,
  ) {}

  @Post('register')
  async register(
    @Body() input: RegisterInput,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    await this.auth.register(
      input.email,
      input.password,
      input.name,
      input.locale ?? 'fr',
    );
    // No session: the account is created unverified and a verification email
    // has been sent. The user signs in once they confirm their address.
    reply.send({ status: 'verification_sent' });
  }

  @Post('login')
  async login(
    @Body() input: LoginInput,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const { user, token } = await this.auth.login(input.email, input.password);
    this.sendSession(reply, user, token);
  }

  @Post('verify-email')
  async verifyEmail(
    @Body() input: TokenInput,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const { user, token } = await this.auth.verifyEmail(input.token);
    this.sendSession(reply, user, token);
  }

  @Post('resend-verification')
  async resendVerification(
    @Body() input: EmailInput,
  ): Promise<{ success: true }> {
    await this.auth.resendVerification(input.email);
    return { success: true };
  }

  @Post('forgot-password')
  async forgotPassword(@Body() input: EmailInput): Promise<{ success: true }> {
    await this.auth.requestPasswordReset(input.email);
    return { success: true };
  }

  @Post('reset-password')
  async resetPassword(
    @Body() input: ResetPasswordInput,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const { user, token } = await this.auth.resetPassword(
      input.token,
      input.password,
    );
    this.sendSession(reply, user, token);
  }

  private sendSession(reply: FastifyReply, user: User, token: string): void {
    reply.setCookie(this.cookie.token, token, this.cookie.tokenOptions());
    reply.send(user);
  }
}
