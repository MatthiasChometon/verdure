import { ConfigService } from '@nestjs/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FileStorageService } from '../../../infrastructure/file-storage/service';
import type { RecognitionJobRepository } from './repository';
import { StaleJobSweeper } from './stale-sweeper';

const failStale = vi.fn<RecognitionJobRepository['failStale']>();
const remove = vi.fn<FileStorageService['remove']>();

const sweeperWith = (settings: Record<string, string> = {}): StaleJobSweeper =>
  new StaleJobSweeper(
    { failStale } as unknown as RecognitionJobRepository,
    { remove } as unknown as FileStorageService,
    new ConfigService(settings),
  );

beforeEach(() => {
  vi.useFakeTimers();
  failStale.mockReset().mockResolvedValue([]);
  remove.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('removing the photos of the jobs it failed', () => {
  it('removes every other photo and still answers when one removal throws', async () => {
    failStale.mockResolvedValue(['a', 'b', 'c']);
    remove.mockImplementation((key) =>
      key === 'b'
        ? Promise.reject(new Error('bucket down'))
        : Promise.resolve(),
    );

    await expect(sweeperWith().sweep('user-1')).resolves.toBeUndefined();

    expect(remove.mock.calls.map(([key]) => key)).toEqual(['a', 'b', 'c']);
  });

  it('looks for jobs older than the configured threshold, for the given user', async () => {
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));

    await sweeperWith({ AI_JOB_STALE_MS: '60000' }).sweep('user-1');

    expect(failStale).toHaveBeenCalledWith(
      new Date('2026-01-01T11:59:00Z'),
      'user-1',
    );
  });
});

describe('the timer', () => {
  it('sweeps at start-up, then on every tick, for all users', async () => {
    const sweeper = sweeperWith();

    sweeper.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(0);
    expect(failStale).toHaveBeenCalledTimes(1);
    expect(failStale.mock.calls[0]?.[1]).toBeUndefined();

    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(failStale).toHaveBeenCalledTimes(2);

    await sweeper.onModuleDestroy();
  });

  it('stops on shutdown', async () => {
    const sweeper = sweeperWith();
    sweeper.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(0);

    await sweeper.onModuleDestroy();
    await vi.advanceTimersByTimeAsync(60 * 60_000);

    expect(failStale).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('survives a failing sweep and keeps ticking', async () => {
    failStale.mockRejectedValueOnce(new Error('db down'));
    const sweeper = sweeperWith();

    sweeper.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(5 * 60_000);

    expect(failStale).toHaveBeenCalledTimes(2);
    await sweeper.onModuleDestroy();
  });

  it('skips a tick while the previous sweep is not finished', async () => {
    let finish: (keys: string[]) => void = () => undefined;
    failStale.mockImplementationOnce(
      () => new Promise<string[]>((resolve) => (finish = resolve)),
    );
    const sweeper = sweeperWith();

    sweeper.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(3 * 5 * 60_000);
    expect(failStale).toHaveBeenCalledTimes(1);

    finish([]);
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(failStale).toHaveBeenCalledTimes(2);
    await sweeper.onModuleDestroy();
  });

  it('waits at shutdown for the sweep in progress', async () => {
    let finish: (keys: string[]) => void = () => undefined;
    failStale.mockImplementationOnce(
      () => new Promise<string[]>((resolve) => (finish = resolve)),
    );
    const sweeper = sweeperWith();
    sweeper.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(0);

    let stopped = false;
    const stopping = sweeper.onModuleDestroy().then(() => {
      stopped = true;
    });
    await vi.advanceTimersByTimeAsync(1_000);
    expect(stopped).toBe(false);

    finish(['photo']);
    await stopping;
    expect(stopped).toBe(true);
    expect(remove).toHaveBeenCalledWith('photo');
  });

  it('never keeps the process alive', async () => {
    const unref = vi.spyOn(global, 'setInterval');
    const sweeper = sweeperWith();

    sweeper.onApplicationBootstrap();

    expect(unref).toHaveBeenCalled();
    const timer = unref.mock.results[0]?.value as { hasRef: () => boolean };
    expect(timer.hasRef()).toBe(false);
    await sweeper.onModuleDestroy();
    unref.mockRestore();
  });
});
