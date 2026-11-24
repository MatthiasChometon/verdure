import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { bootTestApp } from '../testing/test-app';
import { BackgroundTasks } from './service';

// Slower than the shutdown itself: Nest ends the database pool within a few
// milliseconds of close(), so anything not drained first finds it closed.
const slowerThanShutdown = (): Promise<void> =>
  new Promise((done) => setTimeout(done, 150));

describe('stopping the server (e2e)', () => {
  it('lets background work finish while the database is still open', async () => {
    const { app, database } = await bootTestApp();
    const finished: string[] = [];
    app.get(BackgroundTasks).run(
      'late query',
      async () => {
        await slowerThanShutdown();
        await database.execute(sql`select 1`);
        finished.push('queried');
      },
      5_000,
    );

    await app.close();

    expect(finished).toEqual(['queried']);
  });
});
