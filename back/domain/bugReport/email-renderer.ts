import { Injectable } from '@nestjs/common';
import type { MailMessage } from '../../infrastructure/mail/type';
import type { ReportContext } from './type';

const SEVERITY_LABEL: Record<string, string> = {
  BLOCKING: 'Bloquant',
  ANNOYING: 'Gênant',
  COSMETIC: 'Cosmétique',
};

// A notice for the maintainer, not a newsletter: no greeting, no branding.
@Injectable()
export class BugReportEmailRenderer {
  render(
    to: string,
    severity: string,
    message: string,
    context: ReportContext,
    reportedBy: string,
    filedToday: number,
    hasScreenshot: boolean,
  ): MailMessage {
    const label = SEVERITY_LABEL[severity] ?? severity;
    const lines: (readonly [string, string])[] = [
      ['Gravité', label],
      ['Page', context.page],
      ['Signalé par', reportedBy],
      // No attachment; just points to the reports screen where it's shown.
      ...(hasScreenshot
        ? [
            [
              'Capture',
              'jointe — visible sur l’écran des signalements',
            ] as const,
          ]
        : []),
      // Once the hourly cap silences further mails, this is what still shows a
      // flood is under way — the number that tells you to reach for the block button.
      ['Signalements de ce compte en 24 h', String(filedToday)],
      ['Écran', context.viewport],
      ['Langue', context.locale],
      ['Navigateur', context.userAgent],
    ];

    const rows = lines
      .map(
        ([name, value]): string =>
          `<tr><td style="padding:2px 12px 2px 0;color:#78716c;white-space:nowrap;">${name}</td><td style="padding:2px 0;">${this.escape(value)}</td></tr>`,
      )
      .join('');

    return {
      to,
      subject: `[verdure] ${label} — ${message.slice(0, 60)}`,
      html: `<!doctype html><html><body style="margin:0;padding:24px;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#1c1917;">
  <p style="margin:0 0 16px;white-space:pre-wrap;font-size:16px;line-height:1.6;">${this.escape(message)}</p>
  <table style="border-collapse:collapse;font-size:13px;">${rows}</table>
</body></html>`,
      text: `${message}\n\n${lines.map(([name, value]): string => `${name} : ${value}`).join('\n')}\n`,
    };
  }

  // Interpolated values come from a person filing a report, so they're escaped.
  private escape(text: string): string {
    return text
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }
}
