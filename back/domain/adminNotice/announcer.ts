import { Injectable } from '@nestjs/common';
import { BackgroundTasks } from '../../infrastructure/background/service';
import { MailService } from '../../infrastructure/mail/service';
import type { AnnounceOptions } from './type';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
export const ANNOUNCE_TIMEOUT_MS = 15_000;

// Caps only the emails sent, never what is saved (the row is kept either way).
// Shared rhythm for every slice announcing to admins; wording stays with the caller.
const NOTICES_PER_HOUR = 3;
const NOTICES_PER_DAY = 10;

// Announces after the request has answered: the report is saved either way, so
// a slow SMTP server or a failing count never delays or fails it. A failure is
// logged with the caller's label, and one bad address does not stop the round.
@Injectable()
export class AdminAnnouncer {
  constructor(
    private readonly mail: MailService,
    private readonly background: BackgroundTasks,
  ) {}

  announce(options: AnnounceOptions): void {
    this.background.run(
      options.failureLabel,
      () => this.announceRound(options),
      ANNOUNCE_TIMEOUT_MS,
    );
  }

  // Count includes the one just filed, so the 4th of an hour is first to go unannounced.
  private async announceRound(options: AnnounceOptions): Promise<void> {
    const now = Date.now();
    const filedToday = await options.countSince(
      options.reporterId,
      new Date(now - DAY_MS),
    );
    const filedThisHour = await options.countSince(
      options.reporterId,
      new Date(now - HOUR_MS),
    );

    if (filedThisHour > NOTICES_PER_HOUR || filedToday > NOTICES_PER_DAY) {
      options.onSkipped(filedToday);
      return;
    }

    this.background.run(
      options.failureLabel,
      async () => {
        for (const admin of options.recipients) {
          await this.mail.send(options.buildMessage(admin, filedToday));
        }
      },
      ANNOUNCE_TIMEOUT_MS,
    );
  }
}
