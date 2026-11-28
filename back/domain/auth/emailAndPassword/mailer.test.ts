import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BackgroundTasks } from '../../../infrastructure/background/service';
import { AuthMailer, MAIL_TIMEOUT_MS } from './mailer';

const neverSettles = (): Promise<never> => new Promise<never>(() => undefined);

describe('AuthMailer timeout', () => {
  const recipient = {
    id: 'u1',
    email: 'a@test.dev',
    name: 'A',
    locale: 'en',
  };
  const tokens = { issue: () => Promise.resolve('raw') };
  const emails = { render: () => Promise.resolve({ subject: 's', text: 't' }) };
  const config = { getOrThrow: () => 'https://front.test' };
  const stuckMail = { send: neverSettles };

  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('gives up on a mail server that never answers, and logs it', async () => {
    const logged = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const background = new BackgroundTasks();
    const mailer = new AuthMailer(
      tokens as never,
      emails as never,
      stuckMail as never,
      config as never,
      background,
    );

    mailer.sendVerification(recipient);
    const idle = background.idle();
    await vi.advanceTimersByTimeAsync(MAIL_TIMEOUT_MS);
    await idle;

    expect(logged).toHaveBeenCalledOnce();
    expect(String(logged.mock.calls[0]?.[0])).toContain('timed out');
  });
});
