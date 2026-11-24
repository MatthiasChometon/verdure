import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DATABASE, type Database } from '../../infrastructure/database/token';
import { UserMapper } from '../user/mapper';
import { User } from '../user/model';
import { UserRepository } from '../user/repository';
import { AuthMailer } from './emailAndPassword/mailer';
import { AuthTokenRepository } from './emailAndPassword/token-repository';
import { PasswordService } from './emailAndPassword/password.service';
import { GoogleOAuth } from './google/service';
import { Session } from './type';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE) private readonly database: Database,
    private readonly google: GoogleOAuth,
    private readonly users: UserRepository,
    private readonly jwt: JwtService,
    private readonly passwords: PasswordService,
    private readonly tokens: AuthTokenRepository,
    private readonly mailer: AuthMailer,
    private readonly config: ConfigService,
    private readonly userMapper: UserMapper,
  ) {}

  authorizationUrl(state: string): string {
    return this.google.authorizationUrl(state);
  }

  // The front hides the Google button when this is false (e.g. a fresh dev
  // checkout with no OAuth app configured); email/password still works.
  isGoogleEnabled(): boolean {
    return (this.config.get<string>('GOOGLE_CLIENT_ID') ?? '') !== '';
  }

  async signIn(code: string): Promise<string> {
    const profile = await this.google.fetchProfile(code);
    const savedUser = await this.users.upsertByGoogleId(profile);
    return this.jwt.signAsync({ sub: savedUser.id });
  }

  // Creates an unverified account and queues a verification link. No session is
  // returned: the user must confirm their email before they can sign in.
  async register(
    email: string,
    password: string,
    name: string,
    locale: string,
  ): Promise<void> {
    const passwordHash = await this.passwords.hash(password);
    const user = await this.users.createWithPassword({
      email,
      name,
      passwordHash,
      locale,
    });
    if (user === undefined) {
      throw new ConflictException('This email is already registered.');
    }
    this.mailer.sendVerification({ ...user, locale });
  }

  async login(email: string, password: string): Promise<Session> {
    const record = await this.users.findByEmail(email);
    // An unknown or Google-only account still pays for one derivation, so the
    // response time does not tell which emails are registered.
    const valid =
      record?.passwordHash === undefined || record.passwordHash === null
        ? await this.passwords.pretendToVerify(password)
        : await this.passwords.verify(password, record.passwordHash);
    if (record === undefined || !valid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (record.emailVerifiedAt === null) {
      throw new ForbiddenException('Email not verified.');
    }

    return this.sessionFor(this.userMapper.toModel(record));
  }

  async verifyEmail(rawToken: string): Promise<Session> {
    // The token is spent in the transaction of the write it authorises: a failed
    // write rolls the spend back, and two clicks cannot both succeed.
    const user = await this.database.transaction(async (tx) => {
      const userId = await this.tokens.spend(
        rawToken,
        'email_verification',
        tx,
      );
      return userId === undefined
        ? undefined
        : this.users.markEmailVerified(userId, tx);
    });
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
    this.mailer.sendVerification(record);
  }

  // No account enumeration (uniform response, and the e-mail is queued, so the
  // answer is as fast for a registered address as for an unknown one).
  async requestPasswordReset(email: string): Promise<void> {
    const record = await this.users.findByEmail(email);
    if (record !== undefined) {
      this.mailer.sendPasswordReset(record, record.passwordHash !== null);
    }
  }

  async resetPassword(rawToken: string, password: string): Promise<Session> {
    // Hashed before the transaction: scrypt must not hold a connection open.
    const passwordHash = await this.passwords.hash(password);
    const user = await this.database.transaction(async (tx) => {
      const userId = await this.tokens.spend(rawToken, 'password_reset', tx);
      return userId === undefined
        ? undefined
        : this.users.resetPassword(userId, passwordHash, tx);
    });
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

  private async sessionFor(user: User): Promise<Session> {
    const token = await this.jwt.signAsync({ sub: user.id });
    return { user, token };
  }
}
