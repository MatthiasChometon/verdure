import { Global, Logger, Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTestAccount, createTransport } from 'nodemailer';
import { MailService } from './service';
import { MAIL_TRANSPORT, type MailTransport } from './token';

// Explicit ceilings, all under the 15 s a background side effect is allowed
// (ANNOUNCE_TIMEOUT_MS): a dead or silent SMTP server fails the send quickly
// instead of holding a socket until nodemailer's own (much longer) defaults.
export const SMTP_TIMEOUTS = {
  connectionTimeout: 5_000,
  greetingTimeout: 5_000,
  socketTimeout: 10_000,
} as const;

const transportProvider: Provider = {
  provide: MAIL_TRANSPORT,
  useFactory: async (config: ConfigService): Promise<MailTransport> => {
    const host = config.getOrThrow<string>('MAIL_HOST');

    // Zero-setup test account (Nodemailer Ethereal): a real SMTP inbox created
    // on the fly, emails viewable via a preview URL logged on each send.
    if (host === 'ethereal') {
      const account = await createTestAccount();
      Logger.log(
        `Ethereal test inbox — ${account.user} / ${account.pass} (log in at https://ethereal.email/login)`,
        'MailModule',
      );
      return createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: { user: account.user, pass: account.pass },
        ...SMTP_TIMEOUTS,
      });
    }

    const user = config.get<string>('MAIL_USER');
    const pass = config.get<string>('MAIL_PASS');
    return createTransport({
      host,
      port: Number(config.getOrThrow<string>('MAIL_PORT')),
      // TLS follows MAIL_SECURE: implicit TLS when true, else STARTTLS if offered.
      secure: config.get<string>('MAIL_SECURE') === 'true',
      ...SMTP_TIMEOUTS,
      // Mailpit (dev) needs no auth; Gmail (prod) uses an app password.
      auth: user ? { user, pass: pass ?? '' } : undefined,
    });
  },
  inject: [ConfigService],
};

@Global()
@Module({
  providers: [transportProvider, MailService],
  exports: [MailService],
})
export class MailInfrastructureModule {}
