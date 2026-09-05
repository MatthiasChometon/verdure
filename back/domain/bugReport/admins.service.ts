import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Env-only on purpose: no screen ever grants this right. Unset means NOBODY is
// an admin (safe default — the opposite of an empty guest list meaning everyone).
@Injectable()
export class Admins {
  constructor(private readonly config: ConfigService) {}

  private get emails(): string[] {
    return (this.config.get<string>('ADMIN_EMAILS') ?? '')
      .split(',')
      .map((email): string => email.trim().toLowerCase())
      .filter((email): boolean => email.length > 0);
  }

  has(email: string): boolean {
    return this.emails.includes(email.trim().toLowerCase());
  }

  /** Where a new report is announced. Empty when nobody is listed, and the
   *  report is then simply kept rather than sent nowhere. */
  get recipients(): string[] {
    return this.emails;
  }
}
