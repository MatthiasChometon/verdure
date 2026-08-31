import { MailMessage } from '../../../infrastructure/mail/type';

// Captures the emails the app would send so tests can read the tokenised links.
export class MailStub {
  messages: MailMessage[] = [];

  send(message: MailMessage): Promise<void> {
    this.messages.push(message);
    return Promise.resolve();
  }

  lastTokenFor(email: string): string {
    const message = [...this.messages].reverse().find((m) => m.to === email);
    return /token=([a-f0-9]+)/.exec(message?.text ?? '')?.[1] ?? '';
  }
}
