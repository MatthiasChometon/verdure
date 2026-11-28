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
import { BackgroundTasks } from '../../../infrastructure/background/service';
import type { PlantEmbeddingRequest } from '../../aiWorker/embedding/service';
import { PlantEmbeddingWriter } from './embedding-writer';

const request = {
  plantId: 'p1',
  userId: 'u1',
  name: 'Monstera',
  species: 'Monstera deliciosa',
} as PlantEmbeddingRequest;

describe('PlantEmbeddingWriter', () => {
  const where = vi.fn();
  const set = vi.fn(() => ({ where }));
  const database = { update: () => ({ set }) };
  const enqueuePlant = vi.fn();
  let embed: ReturnType<typeof vi.fn>;
  let background: BackgroundTasks;
  let writer: PlantEmbeddingWriter;
  let logged: MockInstance<(message: unknown) => void>;

  beforeEach(() => {
    embed = vi.fn();
    background = new BackgroundTasks();
    logged = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    writer = new PlantEmbeddingWriter(
      database as never,
      { embed } as never,
      { enqueuePlant } as never,
      background,
    );
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('is part of what a shutdown waits for', async () => {
    embed.mockResolvedValue([0.1]);
    where.mockResolvedValue(undefined);

    writer.schedule(request);
    expect(set).not.toHaveBeenCalled();
    await background.idle();

    expect(set).toHaveBeenCalledWith({ embedding: [0.1] });
  });

  it('routes it through the worker queue when nothing embeds locally', async () => {
    embed.mockResolvedValue(undefined);

    writer.schedule(request);
    await background.idle();

    expect(enqueuePlant).toHaveBeenCalledWith(request);
  });

  it('logs a failure through the registry instead of throwing', async () => {
    embed.mockRejectedValue(new Error('model offline'));

    writer.schedule(request);
    await background.idle();

    expect(String(logged.mock.calls[0]?.[0])).toContain('model offline');
  });

  it('gives up on an embedding call that never answers', async () => {
    vi.useFakeTimers();
    embed.mockReturnValue(new Promise(() => undefined));

    writer.schedule(request);
    const idle = background.idle(120_000);
    await vi.advanceTimersByTimeAsync(60_000);
    await idle;

    expect(String(logged.mock.calls[0]?.[0])).toContain('timed out');
  });
});
