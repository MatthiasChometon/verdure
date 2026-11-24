import { sql } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';
import { DATABASE_CLIENT, type DatabaseClient } from '../database/token';
import { bootTestApp } from '../testing/test-app';
import { BackgroundTasks } from './service';

describe('stopping the server (e2e)', () => {
  it('lets background work finish while the database is still open', async () => {
    const { app, database } = await bootTestApp();
    const tasks = app.get(BackgroundTasks);
    const client = app.get<DatabaseClient>(DATABASE_CLIENT);

    // The task waits on a latch that the shutdown itself releases: when the
    // database module starts draining (idle) or, if nothing drains, when it ends
    // the pool. Either way the task resumes after close() has started, with no
    // timing involved: it only finds the pool open if the drain came first.
    let release!: () => void;
    const latch = new Promise<void>((resolve) => {
      release = resolve;
    });
    const idle = tasks.idle.bind(tasks);
    vi.spyOn(tasks, 'idle').mockImplementation((...args) => {
      release();
      return idle(...args);
    });
    const end = client.end.bind(client);
    vi.spyOn(client, 'end').mockImplementation((...args) => {
      release();
      return end(...args);
    });
    const finished: string[] = [];
    tasks.run(
      'late query',
      async () => {
        await latch;
        await database.execute(sql`select 1`);
        finished.push('queried');
      },
      5_000,
    );

    await app.close();

    expect(finished).toEqual(['queried']);
  });
});
