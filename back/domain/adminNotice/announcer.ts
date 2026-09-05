import { Injectable } from '@nestjs/common';
import { MailService } from '../../infrastructure/mail/service';
import type { AnnounceOptions, AnnounceResult } from './type';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// Caps only the emails sent, never what is saved (the row is kept either way).
// Shared rhythm for every slice announcing to admins; wording stays with the caller.
const NOTICES_PER_HOUR = 3;
const NOTICES_PER_DAY = 10;

@Injectable()
export class AdminAnnouncer {
  constructor(private readonly mail: MailService) {}

  // Count includes the one just filed, so the 4th of an hour is first to go unannounced.
  // Per-admin send failures go through onSendFailed, not thrown — one bad address doesn't stop the round.
  async announce(options: AnnounceOptions): Promise<AnnounceResult> {
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
      return { skipped: true, filedToday };
    }

    for (const admin of options.recipients) {
      try {
        await this.mail.send(options.buildMessage(admin, filedToday));
      } catch (error) {
        options.onSendFailed(error);
      }
    }

    return { skipped: false, filedToday };
  }
}
