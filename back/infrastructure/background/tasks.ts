import { Logger } from '@nestjs/common';

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

// Side effects that follow a state change (a mail, a push, a file removal): they
// run after the request has answered, never turn the main write into a failure,
// and are capped by a timeout. A failure is logged, nothing is thrown. The owner
// drains them in `beforeApplicationShutdown` with `idle()` (the database pool
// closes in `onModuleDestroy`, which runs before `onApplicationShutdown`).
export class BackgroundTasks {
  private readonly logger: Logger;
  private readonly pending = new Set<Promise<void>>();

  constructor(context: string) {
    this.logger = new Logger(context);
  }

  run(label: string, work: () => Promise<void>, timeoutMs: number): void {
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
  // running task started on the way.
  async idle(): Promise<void> {
    while (this.pending.size > 0) {
      await Promise.all([...this.pending]);
    }
  }
}
