import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../../infrastructure/mail/service';
import { UserMapper } from '../user/mapper';
import { User } from '../user/model';
import { UserRepository } from '../user/repository';
import { EmailRenderer } from './emailAndPassword/email-renderer';
import { AuthTokenRepository } from './emailAndPassword/token-repository';
import { PasswordService } from './emailAndPassword/password.service';
import { GoogleOAuth } from './google/service';
import { Session } from './type';

const VERIFICATION_TTL = 24 * 60 * 60;
const RESET_TTL = 60 * 60;

@Injectable()
export class AuthService {
  constructor(
    private readonly google: GoogleOAuth,
    private readonly users: UserRepository,
    private readonly jwt: JwtService,
    private readonly passwords: PasswordService,
    private readonly tokens: AuthTokenRepository,
    private readonly emails: EmailRenderer,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly userMapper: UserMapper,
  ) {}

  authorizationUrl(state: string): string {
    return this.google.authorizationUrl(state);
  }

  async signIn(code: string): Promise<string> {
    const profile = await this.google.fetchProfile(code);
    const savedUser = await this.users.upsertByGoogleId(profile);
    return this.jwt.signAsync({ sub: savedUser.id });
  }

  // Creates an unverified account and emails a verification link. No session is
  // returned: the user must confirm their email before they can sign in.
  async register(
    email: string,
    password: string,
    name: string,
    locale: string,
  ): Promise<void> {
    const existing = await this.users.findByEmail(email);
    if (existing !== undefined) {
      throw new ConflictException('This email is already registered.');
    }

    const passwordHash = await this.passwords.hash(password);
    const user = await this.users.createWithPassword({
      email,
      name,
      passwordHash,
      locale,
    });
    await this.sendVerification(user.id, user.email, user.name, locale);
  }

  async login(email: string, password: string): Promise<Session> {
    const record = await this.users.findByEmail(email);
    if (record === undefined || record.passwordHash === null) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const valid = await this.passwords.verify(password, record.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (record.emailVerifiedAt === null) {
      throw new ForbiddenException('Email not verified.');
    }

    return this.sessionFor(this.userMapper.toModel(record));
  }

  async verifyEmail(rawToken: string): Promise<Session> {
    const userId = await this.tokens.consume(rawToken, 'email_verification');
    if (userId === undefined) {
      throw new UnauthorizedException('Invalid or expired verification link.');
    }
    await this.users.markEmailVerified(userId);
    const user = await this.users.findById(userId);
    if (user === undefined) {
      throw new UnauthorizedException('Invalid or expired verification link.');
    }
    return this.sessionFor(user);
  }

  // Silent on purpose (no account enumeration): only sends when an unverified
  // account exists.
  async resendVerification(email: string): Promise<void> {
    const record = await this.users.findByEmail(email);
    if (record === undefined || record.emailVerifiedAt !== null) {
      return;
    }
    await this.sendVerification(
      record.id,
      record.email,
      record.name,
      record.locale,
    );
  }

  // Silent on purpose: only sends when a password account exists for the email.
  async requestPasswordReset(email: string): Promise<void> {
    const record = await this.users.findByEmail(email);
    if (record === undefined || record.passwordHash === null) {
      return;
    }
    const raw = await this.tokens.issue(record.id, 'password_reset', RESET_TTL);
    const url = `${this.frontUrl()}/reset-password?token=${raw}`;
    const rendered = await this.emails.render(
      'passwordReset',
      { name: record.name, url },
      record.locale,
    );
    await this.mail.send({ to: record.email, ...rendered });
  }

  async resetPassword(rawToken: string, password: string): Promise<Session> {
    const userId = await this.tokens.consume(rawToken, 'password_reset');
    if (userId === undefined) {
      throw new UnauthorizedException('Invalid or expired reset link.');
    }
    const passwordHash = await this.passwords.hash(password);
    await this.users.updatePassword(userId, passwordHash);
    // Resetting via the emailed link also proves ownership of the address.
    await this.users.markEmailVerified(userId);
    const user = await this.users.findById(userId);
    if (user === undefined) {
      throw new UnauthorizedException('Invalid or expired reset link.');
    }
    return this.sessionFor(user);
  }

  async userFromToken(token: string): Promise<User | undefined> {
    try {
      const { sub } = await this.jwt.verifyAsync<{ sub: string }>(token);
      return await this.users.findById(sub);
    } catch {
      return undefined;
    }
  }

  private async sendVerification(
    userId: string,
    email: string,
    name: string,
    locale: string,
  ): Promise<void> {
    const raw = await this.tokens.issue(
      userId,
      'email_verification',
      VERIFICATION_TTL,
    );
    const url = `${this.frontUrl()}/verify-email?token=${raw}`;
    const rendered = await this.emails.render(
      'verification',
      { name, url },
      locale,
    );
    await this.mail.send({ to: email, ...rendered });
  }

  private frontUrl(): string {
    return this.config.getOrThrow<string>('FRONT_URL');
  }

  private async sessionFor(user: User): Promise<Session> {
    const token = await this.jwt.signAsync({ sub: user.id });
    return { user, token };
  }
}
