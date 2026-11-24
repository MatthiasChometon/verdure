import { Injectable } from '@nestjs/common';
import type { MailMessage } from '../../infrastructure/mail/type';
import { renderNotice } from '../adminNotice/notice-email';
import { ImprovementImportance } from './enum';
import type { SuggestionContext } from './type';

const IMPORTANCE_LABEL: Record<ImprovementImportance, string> = {
  [ImprovementImportance.NICE_TO_HAVE]: 'Ce serait sympa',
  [ImprovementImportance.WOULD_HELP]: 'Ça aiderait',
  [ImprovementImportance.IMPORTANT]: 'Important',
};

export type IdeaNotice = {
  to: string;
  importance: ImprovementImportance;
  message: string;
  context: SuggestionContext;
  requestedBy: string;
  filedToday: number;
};

// Written for whoever maintains the site: what is needed to weigh an idea and
// nothing else.
@Injectable()
export class ImprovementRequestEmailRenderer {
  render(notice: IdeaNotice): MailMessage {
    const { context } = notice;
    return renderNotice({
      to: notice.to,
      subject: `[verdure] Idée — ${notice.message.slice(0, 60)}`,
      message: notice.message,
      rows: [
        ['Importance', IMPORTANCE_LABEL[notice.importance]],
        ['Page', context.page],
        ['Proposé par', notice.requestedBy],
        ['Propositions de ce compte en 24 h', String(notice.filedToday)],
        ['Écran', context.viewport],
        ['Langue', context.locale],
        ['Navigateur', context.userAgent],
      ],
    });
  }
}
