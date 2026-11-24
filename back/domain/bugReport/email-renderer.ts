import { Injectable } from '@nestjs/common';
import type { MailMessage } from '../../infrastructure/mail/type';
import { renderNotice } from '../adminNotice/notice-email';
import { BugSeverity } from './enum';
import type { ReportContext } from './type';

const SEVERITY_LABEL: Record<BugSeverity, string> = {
  [BugSeverity.BLOCKING]: 'Bloquant',
  [BugSeverity.ANNOYING]: 'Gênant',
  [BugSeverity.COSMETIC]: 'Cosmétique',
};

export type BugNotice = {
  to: string;
  severity: BugSeverity;
  message: string;
  context: ReportContext;
  reportedBy: string;
  filedToday: number;
  hasScreenshot: boolean;
};

@Injectable()
export class BugReportEmailRenderer {
  render(notice: BugNotice): MailMessage {
    const label = SEVERITY_LABEL[notice.severity];
    const { context } = notice;
    return renderNotice({
      to: notice.to,
      subject: `[verdure] ${label} — ${notice.message.slice(0, 60)}`,
      message: notice.message,
      rows: [
        ['Gravité', label],
        ['Page', context.page],
        ['Signalé par', notice.reportedBy],
        // No attachment; just points to the reports screen where it's shown.
        ...(notice.hasScreenshot
          ? [
              [
                'Capture',
                'jointe — visible sur l’écran des signalements',
              ] as const,
            ]
          : []),
        // Once the hourly cap silences further mails, this is what still shows a
        // flood is under way — the number that tells you to reach for the block button.
        ['Signalements de ce compte en 24 h', String(notice.filedToday)],
        ['Écran', context.viewport],
        ['Langue', context.locale],
        ['Navigateur', context.userAgent],
      ],
    });
  }
}
