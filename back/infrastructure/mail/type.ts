export type MailMessage = {
  to: string;
  subject: string;
  // Optional: Gmail silently drops an HTML+link email from a low-reputation
  // sender, so link-bearing transactional mails (verification, reset) go text-only.
  html?: string;
  text: string;
};
