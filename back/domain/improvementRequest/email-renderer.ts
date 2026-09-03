import { Injectable } from '@nestjs/common';
import type { MailMessage } from '../../infrastructure/mail/type';
import type { SuggestionContext } from './type';

const IMPORTANCE_LABEL: Record<string, string> = {
  NICE_TO_HAVE: 'Ce serait sympa',
  WOULD_HELP: 'Ça aiderait',
  IMPORTANT: 'Important',
};

// Written for whoever maintains the site: what is needed to weigh an idea and
// nothing else.
@Injectable()
export class ImprovementRequestEmailRenderer {
  render(
    to: string,
    importance: string,
    message: string,
    context: SuggestionContext,
    requestedBy: string,
    filedToday: number,
  ): MailMessage {
    const label = IMPORTANCE_LABEL[importance] ?? importance;
    const lines = [
      ['Importance', label],
      ['Page', context.page],
      ['Proposé par', requestedBy],
      ['Propositions de ce compte en 24 h', String(filedToday)],
      ['Écran', context.viewport],
      ['Langue', context.locale],
      ['Navigateur', context.userAgent],
    ] as const;

    const rows = lines
      .map(
        ([name, value]): string =>
          `<tr><td style="padding:2px 12px 2px 0;color:#78716c;white-space:nowrap;">${name}</td><td style="padding:2px 0;">${this.escape(value)}</td></tr>`,
      )
      .join('');

    return {
      to,
      subject: `[verdure] Idée — ${message.slice(0, 60)}`,
      html: `<!doctype html><html><body style="margin:0;padding:24px;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#1c1917;">
  <p style="margin:0 0 16px;white-space:pre-wrap;font-size:16px;line-height:1.6;">${this.escape(message)}</p>
  <table style="border-collapse:collapse;font-size:13px;">${rows}</table>
</body></html>`,
      text: `${message}\n\n${lines.map(([name, value]): string => `${name} : ${value}`).join('\n')}\n`,
    };
  }

  // Everything interpolated comes from a person, so it is escaped — an email
  // client renders the same HTML a browser does.
  private escape(text: string): string {
    return text
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }
}
