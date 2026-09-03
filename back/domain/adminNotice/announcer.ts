import { Injectable } from '@nestjs/common';
import { MailService } from '../../infrastructure/mail/service';
import type { AnnounceOptions, AnnounceResult } from './type';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// What is spammable here is attention, not storage: a row costs nothing, an
// email that pulls somebody out of what they were doing costs a great deal.
// The cap bounds only the announcements a slice sends — never what it saves
// — so somebody past the cap still has their report or idea kept in full,
// just without a mail this time.
//
// Three an hour is more than a real reader ever files in one sitting, and ten
// a day bounds a bad night without ever refusing a word. Shared by every
// slice that announces something to the administrators: the rhythm is the
// same wherever the row came from — only the wording of what gets sent, and
// the counting behind it, stays with the caller.
const NOTICES_PER_HOUR = 3;
const NOTICES_PER_DAY = 10;

@Injectable()
export class AdminAnnouncer {
  constructor(private readonly mail: MailService) {}

  // Counted including the one just filed, so the fourth of an hour is the
  // first to go unannounced — the record itself is already safe by the time
  // this runs. A caller reads `skipped` to log that in its own words; a
  // per-admin send failure is reported through `onSendFailed` rather than
  // thrown, so one bad address never stops the rest of the round.
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
