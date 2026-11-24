import { Injectable, Logger } from '@nestjs/common';

const describe = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const withTimeout = async (work: Promise<void>, ms: number): Promise<void> => {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms} ms`)), ms);
  });
  try {
    await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer);
  }
};

// How long a shutdown waits for background work before letting the pool end
// anyway: a task that hangs must not hold the process (a deploy restart) for
// the length of its own timeout.
export const SHUTDOWN_DRAIN_TIMEOUT_MS = 30_000;

// Side effects that follow a state change (a mail, a push, a file removal): they
// run after the request has answered, never turn the main write into a failure,
// and are capped by a timeout. A failure is logged, nothing is thrown. The
// database module awaits `idle()` before ending its pool: Nest runs
// `onModuleDestroy` ahead of both shutdown hooks, so any later drain would
// find the database already closed.
@Injectable()
export class BackgroundTasks {
  private readonly logger = new Logger(BackgroundTasks.name);
  private readonly pending = new Set<Promise<void>>();

  run(label: string, work: () => Promise<void>, timeoutMs: number): void {
    // `then` so a plain function that throws synchronously is caught like a rejection.
    const task = withTimeout(work(), timeoutMs)
      .catch((error: unknown) => {
        this.logger.error(
          `${label} failed: ${describe(error)}`,
          error instanceof Error ? error.stack : undefined,
        );
      })
      .finally(() => this.pending.delete(task));
    this.pending.add(task);
  }

  // Resolves when every task has finished or failed, including the ones a
  // running task started on the way, or once the ceiling is reached: the tasks
  // still running then are counted in the log and left behind.
  async idle(ceilingMs: number = SHUTDOWN_DRAIN_TIMEOUT_MS): Promise<void> {
    let timer: NodeJS.Timeout | undefined;
    let expired = false;
    const ceiling = new Promise<void>((resolve) => {
      timer = setTimeout(() => {
        expired = true;
        resolve();
      }, ceilingMs);
    });
    const drained = (async (): Promise<void> => {
      while (this.pending.size > 0 && !expired) {
        await Promise.all([...this.pending]);
      }
    })();
    try {
      await Promise.race([drained, ...(ceilingMs < 0 ? [ceiling] : [])]);
    } finally {
      clearTimeout(timer);
    }
    if (this.pending.size > 0) {
      this.logger.error(
        `${this.pending.size} background task(s) abandoned after ${ceilingMs} ms of shutdown drain.`,
      );
    }
  }
}
