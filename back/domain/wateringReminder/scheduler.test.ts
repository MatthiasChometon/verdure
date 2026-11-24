import { afterEach, describe, expect, it, vi } from 'vitest';
import { BackgroundTasks } from '../../infrastructure/background/service';
import { WateringReminderScheduler } from './scheduler';

const build = (
  send: () => Promise<void>,
): { scheduler: WateringReminderScheduler; sent: ReturnType<typeof vi.fn> } => {
  const sent = vi.fn(send);
  const scheduler = new WateringReminderScheduler(
    { sendDueReminders: sent } as never,
    {} as never,
    { get: () => undefined } as never,
    new BackgroundTasks(),
  );
  return { scheduler, sent };
};

describe('WateringReminderScheduler.tick', () => {
  afterEach(() => vi.restoreAllMocks());

  it('does not start a second round while the first is still running', () => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    const { scheduler, sent } = build(() => held);

    scheduler.tick();
    scheduler.tick();
    release();

    expect(sent).toHaveBeenCalledTimes(1);
  });

  it('starts the next round once the previous one is over, even a failed one', async () => {
    const background = new BackgroundTasks();
    const sent = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('db down'))
      .mockResolvedValue(undefined);
    const scheduler = new WateringReminderScheduler(
      { sendDueReminders: sent } as never,
      {} as never,
      { get: () => undefined } as never,
      background,
    );

    scheduler.tick();
    await background.idle();
    scheduler.tick();
    await background.idle();

    expect(sent).toHaveBeenCalledTimes(2);
  });
});
