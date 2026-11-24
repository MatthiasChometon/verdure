import { MailMessage } from '../../../infrastructure/mail/type';

// Captures the emails the app would send so tests can read the tokenised links.
// `failure` makes the next sends fail, `gate` holds them until it resolves.
export class MailStub {
  messages: MailMessage[] = [];
  failure: Error | undefined;
  gate: Promise<void> | undefined;

  async send(message: MailMessage): Promise<void> {
    await this.gate;
    if (this.failure !== undefined) {
      throw this.failure;
    }
    this.messages.push(message);
  }

  lastTokenFor(email: string): string {
    const message = [...this.messages].reverse().find((m) => m.to === email);
    return /token=([a-f0-9]+)/.exec(message?.text ?? '')?.[1] ?? '';
  }

  reset(): void {
    this.messages = [];
    this.failure = undefined;
    this.gate = undefined;
  }
}
