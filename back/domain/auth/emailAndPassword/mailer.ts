import { Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
export class AuthMailer implements OnApplicationShutdown {
  private readonly logger = new Logger(AuthMailer.name);
  private readonly pending = new Set<Promise<void>>();

  constructor(
    private readonly tokens: AuthTokenRepository,
    private readonly emails: EmailRenderer,
    private readonly mail: MailService,
    private readonly config: ConfigService,
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

  // Resolves when every e-mail started so far has been delivered or has failed.
  async idle(): Promise<void> {
    await Promise.all([...this.pending]);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.idle();
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
    const task = withTimeout(work(), MAIL_TIMEOUT_MS)
      .catch((error: unknown) => {
        this.logger.error(
          `The ${label} was not sent: ${describe(error)}`,
          error instanceof Error ? error.stack : undefined,
        );
      })
      .finally(() => this.pending.delete(task));
    this.pending.add(task);
  }
}

const describe = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const withTimeout = async (work: Promise<void>, ms: number): Promise<void> => {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms} ms`)), ms);
  });
  try {
    await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer);
  }
};
