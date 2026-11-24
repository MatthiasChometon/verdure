import type { MailMessage } from '../../infrastructure/mail/type';

export type NoticeRow = readonly [label: string, value: string];

export type Notice = {
  to: string;
  subject: string;
  message: string;
  rows: NoticeRow[];
};

// Every interpolated value comes from a person, so it is escaped: an email
// client renders the same HTML a browser does.
const escape = (text: string): string =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const rowHtml = ([label, value]: NoticeRow): string =>
  `<tr><td style="padding:2px 12px 2px 0;color:#78716c;white-space:nowrap;">${label}</td><td style="padding:2px 0;">${escape(value)}</td></tr>`;

// A notice for the maintainer, not a newsletter: the message, then a table of
// what is needed to act on it. Shared by every slice announcing to admins.
export const renderNotice = ({
  to,
  subject,
  message,
  rows,
}: Notice): MailMessage => ({
  to,
  subject,
  html: `<!doctype html><html><body style="margin:0;padding:24px;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#1c1917;">
  <p style="margin:0 0 16px;white-space:pre-wrap;font-size:16px;line-height:1.6;">${escape(message)}</p>
  <table style="border-collapse:collapse;font-size:13px;">${rows.map(rowHtml).join('')}</table>
</body></html>`,
  text: `${message}\n\n${rows.map(([label, value]): string => `${label} : ${value}`).join('\n')}\n`,
});
