import { Logger } from '@nestjs/common';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest';
import type { MailMessage } from '../../infrastructure/mail/type';
import { ANNOUNCE_TIMEOUT_MS, AdminAnnouncer } from './announcer';
import type { AnnounceOptions } from './type';

// The mail server is the only boundary replaced.
class MailBoundary {
  readonly sent: string[] = [];
  gate: Promise<void> | undefined;
  hangsFor: string | undefined;

  async send(message: MailMessage): Promise<void> {
    if (message.to === this.hangsFor) {
      await new Promise<never>(() => undefined);
    }
    await this.gate;
    this.sent.push(message.to);
  }
}

const options = (
  overrides: Partial<AnnounceOptions> = {},
): AnnounceOptions => ({
  recipients: ['one@test.dev', 'two@test.dev'],
  reporterId: 'reporter',
  countSince: () => Promise.resolve(1),
  buildMessage: (admin) => ({ to: admin, subject: 's', text: 't' }),
  failureLabel: 'Report r1 saved but not announced',
  onSkipped: () => undefined,
  ...overrides,
});

describe('AdminAnnouncer', () => {
  let mail: MailBoundary;
  let announcer: AdminAnnouncer;
  let logged: MockInstance<(message: unknown) => void>;

  beforeEach(() => {
    mail = new MailBoundary();
    announcer = new AdminAnnouncer(mail as never);
    logged = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns before anything is sent and delivers to every administrator', async () => {
    let release!: () => void;
    mail.gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    announcer.announce(options());
    expect(mail.sent).toEqual([]);

    release();
    await announcer.idle();
    expect(mail.sent.sort()).toEqual(['one@test.dev', 'two@test.dev']);
  });

  it('is drained before shutdown', async () => {
    let release!: () => void;
    mail.gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    announcer.announce(options());

    const draining = announcer.beforeApplicationShutdown();
    release();
    await draining;

    expect(mail.sent).toHaveLength(2);
  });

  it('logs a failing count instead of throwing, and sends nothing', async () => {
    announcer.announce(
      options({ countSince: () => Promise.reject(new Error('db down')) }),
    );
    await announcer.idle();

    expect(mail.sent).toEqual([]);
    expect(String(logged.mock.calls[0]?.[0])).toContain('db down');
  });

  it('gives up on a mail server that never answers, and still reaches the others', async () => {
    vi.useFakeTimers();
    mail.hangsFor = 'one@test.dev';

    announcer.announce(options());
    const idle = announcer.idle();
    await vi.advanceTimersByTimeAsync(ANNOUNCE_TIMEOUT_MS);
    await idle;

    expect(mail.sent).toEqual(['two@test.dev']);
    expect(logged).toHaveBeenCalledOnce();
    expect(String(logged.mock.calls[0]?.[0])).toContain('timed out');
    expect(String(logged.mock.calls[0]?.[0])).toContain('Report r1');
  });

  it('reports the cap through onSkipped and sends nothing', async () => {
    const skipped = vi.fn();

    announcer.announce(
      options({ countSince: () => Promise.resolve(4), onSkipped: skipped }),
    );
    await announcer.idle();

    expect(skipped).toHaveBeenCalledWith(4);
    expect(mail.sent).toEqual([]);
  });
});
