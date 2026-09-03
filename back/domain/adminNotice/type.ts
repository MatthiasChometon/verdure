import type { MailMessage } from '../../infrastructure/mail/type';

/** Everything AdminAnnouncer needs to run the rhythm for one announcement,
 *  and nothing about what the message says or who the reporter is. */
export type AnnounceOptions = {
  recipients: string[];
  reporterId: string;
  countSince: (userId: string, since: Date) => Promise<number>;
  buildMessage: (admin: string, filedToday: number) => MailMessage;
  onSendFailed: (error: unknown) => void;
};

export type AnnounceResult = {
  /** True once the cap silenced this round — the record itself was still saved. */
  skipped: boolean;
  filedToday: number;
};
