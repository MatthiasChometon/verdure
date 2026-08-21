export type MailMessage = {
  to: string;
  subject: string;
  // Optional on purpose: an email with an HTML part AND a link, from a low-
  // reputation sender, is silently dropped by Gmail — the same content as plain
  // text reaches the inbox. So the link-bearing transactional emails
  // (verification, password reset) are sent text-only, and omit this.
  html?: string;
  text: string;
};
