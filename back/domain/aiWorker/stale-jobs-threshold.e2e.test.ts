import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { AiWorkerTestHarness } from './harness';
import { RecognitionStatus } from './job/enum';
import { recognitionJob } from './job/schema';
import { StaleJobSweeper } from './job/stale-sweeper';

// AI_JOB_STALE_MS is read when the app boots: this file boots it with a 60 s threshold.
const THRESHOLD_MS = 60_000;
const previous = process.env['AI_JOB_STALE_MS'];

describe('the stale job threshold from AI_JOB_STALE_MS (e2e)', () => {
  const harness = new AiWorkerTestHarness();

  beforeAll(async () => {
    process.env['AI_JOB_STALE_MS'] = String(THRESHOLD_MS);
    await harness.init();
  });

  afterAll(async () => {
    await harness.close();
    if (previous === undefined) {
      delete process.env['AI_JOB_STALE_MS'];
    } else {
      process.env['AI_JOB_STALE_MS'] = previous;
    }
  });

  beforeEach(async () => {
    await harness.reset();
  });

  const statusAfterSweepAt = async (
    age: number,
  ): Promise<string | undefined> => {
    const id = await harness.enqueue(harness.aliceId, `photo-${age}`);
    await harness.database
      .update(recognitionJob)
      .set({
        status: RecognitionStatus.PROCESSING,
        updatedAt: new Date(Date.now() - age),
      })
      .where(eq(recognitionJob.id, id));

    await harness.resolve(StaleJobSweeper).sweep(harness.aliceId);

    const [row] = await harness.database
      .select({ status: recognitionJob.status })
      .from(recognitionJob)
      .where(eq(recognitionJob.id, id));
    return row?.status;
  };

  it('keeps a job just under the configured threshold', async () => {
    expect(await statusAfterSweepAt(THRESHOLD_MS - 5_000)).toBe('processing');
  });

  it('fails a job just over the configured threshold', async () => {
    expect(await statusAfterSweepAt(THRESHOLD_MS + 5_000)).toBe('failed');
  });
});
