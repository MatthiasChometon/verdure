import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BackgroundTasks } from '../../infrastructure/background/service';
import { SpeciesSeeder } from './seeder';

describe('SpeciesSeeder', () => {
  afterEach(() => vi.restoreAllMocks());

  it('is drained through the registry and stops at the next batch on shutdown', async () => {
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const batches: number[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const gbif = {
      sweepPlantSpecies: async (
        onBatch: (matches: never[]) => Promise<void>,
      ): Promise<void> => {
        await onBatch([]);
        batches.push(1);
        await gate;
        await onBatch([]);
        batches.push(2);
      },
    };
    const repository = { count: () => Promise.resolve(0), cache: vi.fn() };
    const background = new BackgroundTasks();
    const seeder = new SpeciesSeeder(
      repository as never,
      gbif as never,
      { get: () => undefined } as never,
      background,
    );

    seeder.onApplicationBootstrap();
    await vi.waitFor(() => expect(batches).toEqual([1]));
    seeder.onModuleDestroy();
    release();
    await background.idle();

    expect(batches).toEqual([1]);
  });
});
