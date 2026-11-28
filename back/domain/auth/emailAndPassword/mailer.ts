import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BackgroundTasks } from '../../../infrastructure/background/service';
import { MailService } from '../../../infrastructure/mail/service';
import { EmailRenderer } from './email-renderer';
import { AuthTokenRepository } from './token-repository';

const VERIFICATION_TTL = 24 * 60 * 60;
const RESET_TTL = 60 * 60;
export const MAIL_TIMEOUT_MS = 15_000;

export type Recipient = {
  id: string;
  email: string;
  name: string;
  locale: string;
};

// Sends the account e-mails (verification, reset) after the request has
// answered: the account row exists either way, a failing or slow SMTP server
// never turns that into a 500, and the response time does not depend on whether
// an address is registered. A failure is logged and the person asks again.
@Injectable()
export class AuthMailer {
  constructor(
    private readonly tokens: AuthTokenRepository,
    private readonly emails: EmailRenderer,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly background: BackgroundTasks,
  ) {}

  sendVerification(to: Recipient): void {
    this.inBackground('verification e-mail', async () => {
      const raw = await this.tokens.issue(
        to.id,
        'email_verification',
        VERIFICATION_TTL,
      );
      await this.deliver(to, 'verification', `/verify-email?token=${raw}`);
    });
  }

  // A real account always gets a helpful e-mail: a reset link, or a reminder
  // that it signs in with Google when it has no password.
  sendPasswordReset(to: Recipient, hasPassword: boolean): void {
    this.inBackground('password reset e-mail', async () => {
      if (!hasPassword) {
        await this.deliver(to, 'passwordResetGoogle', '');
        return;
      }
      const raw = await this.tokens.issue(to.id, 'password_reset', RESET_TTL);
      await this.deliver(to, 'passwordReset', `/reset-password?token=${raw}`);
    });
  }

  private async deliver(
    to: Recipient,
    template: 'verification' | 'passwordReset' | 'passwordResetGoogle',
    path: string,
  ): Promise<void> {
    const url = `${this.config.getOrThrow<string>('FRONT_URL')}${path}`;
    const rendered = await this.emails.render(
      template,
      { name: to.name, url },
      to.locale,
    );
    // Text-only (no HTML part): an HTML email carrying a link is dropped by
    // Gmail from this sender, while the same content as plain text is delivered.
    await this.mail.send({
      to: to.email,
      subject: rendered.subject,
      text: rendered.text,
    });
  }

  private inBackground(label: string, work: () => Promise<void>): void {
    this.background.run(`The ${label} was not sent`, work, MAIL_TIMEOUT_MS);
  }
}
