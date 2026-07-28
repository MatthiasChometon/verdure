import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getTestMessageUrl } from 'nodemailer';
import { MAIL_TRANSPORT, type MailTransport } from './token';
import { MailMessage } from './type';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly from: string;

  constructor(
    @Inject(MAIL_TRANSPORT) private readonly transport: MailTransport,
    config: ConfigService,
  ) {
    this.from = config.getOrThrow<string>('MAIL_FROM');
  }

  async send(message: MailMessage): Promise<void> {
    const info = await this.transport.sendMail({ from: this.from, ...message });
    const preview = getTestMessageUrl(info) || undefined;
    if (preview !== undefined) {
      this.logger.log(`Email preview (${message.to}): ${preview}`);
    }
  }
}
