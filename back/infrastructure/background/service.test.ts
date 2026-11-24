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
import { BackgroundTasks } from './service';

const never = (): Promise<void> => new Promise<void>(() => undefined);

describe('BackgroundTasks', () => {
  let tasks: BackgroundTasks;
  let logged: MockInstance<(message: unknown) => void>;

  beforeEach(() => {
    tasks = new BackgroundTasks();
    logged = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('logs a failing task instead of throwing', async () => {
    tasks.run('Mail', () => Promise.reject(new Error('smtp down')), 1000);
    await tasks.idle();

    expect(String(logged.mock.calls[0]?.[0])).toContain('Mail failed');
    expect(String(logged.mock.calls[0]?.[0])).toContain('smtp down');
  });

  it('catches a plain function that throws before returning a promise', async () => {
    tasks.run(
      'Sync',
      () => {
        throw new Error('boom');
      },
      1000,
    );
    await tasks.idle();

    expect(String(logged.mock.calls[0]?.[0])).toContain('boom');
  });

  it('gives up on a task that outlives its timeout', async () => {
    vi.useFakeTimers();
    tasks.run('Slow', never, 500);
    const idle = tasks.idle();

    await vi.advanceTimersByTimeAsync(500);
    await idle;

    expect(String(logged.mock.calls[0]?.[0])).toContain('timed out after 500');
  });

  it('waits for a task that a running task started', async () => {
    const done: string[] = [];
    tasks.run(
      'Outer',
      async () => {
        await Promise.resolve();
        tasks.run(
          'Inner',
          async () => {
            await new Promise((resolve) => setTimeout(resolve, 5));
            done.push('inner');
          },
          1000,
        );
      },
      1000,
    );

    await tasks.idle();

    expect(done).toEqual(['inner']);
  });

  it('stops waiting at the ceiling and says how many tasks it left behind', async () => {
    vi.useFakeTimers();
    tasks.run('Stuck one', never, 60 * 60 * 1000);
    tasks.run('Stuck two', never, 60 * 60 * 1000);
    const idle = tasks.idle(1000);

    await vi.advanceTimersByTimeAsync(1000);
    await idle;

    expect(String(logged.mock.calls[0]?.[0])).toContain('2 background task');
    expect(String(logged.mock.calls[0]?.[0])).toContain('abandoned');
  });
});
