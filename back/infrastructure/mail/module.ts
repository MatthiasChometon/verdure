import { Global, Logger, Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTestAccount, createTransport } from 'nodemailer';
import { MailService } from './service';
import { MAIL_TRANSPORT, type MailTransport } from './token';

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
      });
    }

    const user = config.get<string>('MAIL_USER');
    const pass = config.get<string>('MAIL_PASS');
    return createTransport({
      host,
      port: Number(config.getOrThrow<string>('MAIL_PORT')),
      secure: config.get<string>('MAIL_SECURE') === 'true',
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
