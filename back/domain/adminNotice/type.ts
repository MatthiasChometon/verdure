import type { MailMessage } from '../../infrastructure/mail/type';

/** Everything AdminAnnouncer needs to run the rhythm for one announcement,
 *  and nothing about what the message says or who the reporter is. */
export type AnnounceOptions = {
  recipients: string[];
  reporterId: string;
  countSince: (userId: string, since: Date) => Promise<number>;
  buildMessage: (admin: string, filedToday: number) => MailMessage;
  /** Names what failed in the log, e.g. "Report 12 saved but not announced". */
  failureLabel: string;
  /** The cap silenced this round: the record itself was still saved. */
  onSkipped: (filedToday: number) => void;
};
