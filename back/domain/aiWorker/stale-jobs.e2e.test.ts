import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { AiWorkerTestHarness } from './harness';
import { RecognitionStatus } from './job/enum';
import { JobKind } from './job/enum';
import { recognitionJob } from './job/schema';
import { StaleJobSweeper } from './job/stale-sweeper';

type Identified = { identificationJob: { status: string } };
type Diagnosed = { diagnosisJob: { status: string } };

const IDENTIFY = 'query ($id: ID!) { identificationJob(id: $id) { status } }';
const DIAGNOSE = 'query ($id: ID!) { diagnosisJob(id: $id) { status } }';
const NEXT_JOB = '/worker/next-job';

const MINUTE = 60_000;
// The default threshold is 15 minutes.
const STALE = new Date(Date.now() - 20 * MINUTE);
const RECENT = new Date(Date.now() - 2 * MINUTE);

describe('jobs whose result never arrived (e2e)', () => {
  const harness = new AiWorkerTestHarness();

  beforeAll(async () => {
    await harness.init();
  });

  afterAll(async () => {
    await harness.close();
  });

  beforeEach(async () => {
    await harness.reset();
  });

  // A job a worker claimed (status processing) at `since`, then went silent.
  const processingSince = async (id: string, since: Date): Promise<void> => {
    await harness.database
      .update(recognitionJob)
      .set({ status: RecognitionStatus.PROCESSING, updatedAt: since })
      .where(eq(recognitionJob.id, id));
  };

  it('fails a stale identification, drops its photo, and says so to the app', async () => {
    const jobId = await harness.enqueue(harness.aliceId, 'lost-photo');
    await processingSince(jobId, STALE);

    const job = await harness.graphql<Identified>(
      IDENTIFY,
      harness.aliceToken,
      { id: jobId },
    );

    expect(job.identificationJob.status).toBe('FAILED');
    expect(harness.storage.removed).toEqual(['lost-photo']);
  });

  it('leaves a job the worker is still processing alone', async () => {
    const jobId = await harness.enqueue(harness.aliceId, 'busy-photo');
    await processingSince(jobId, RECENT);

    const job = await harness.graphql<Identified>(
      IDENTIFY,
      harness.aliceToken,
      { id: jobId },
    );

    expect(job.identificationJob.status).toBe('PROCESSING');
    expect(harness.storage.removed).toEqual([]);
  });

  it('never touches a pending job, however old', async () => {
    const jobId = await harness.enqueue(harness.aliceId, 'queued-photo');
    await harness.database
      .update(recognitionJob)
      .set({ updatedAt: STALE })
      .where(eq(recognitionJob.id, jobId));

    const job = await harness.graphql<Identified>(
      IDENTIFY,
      harness.aliceToken,
      { id: jobId },
    );

    expect(job.identificationJob.status).toBe('PENDING');
  });

  it("never touches another user's stale job", async () => {
    const bobJob = await harness.enqueue(harness.bobId, 'bob-photo');
    await processingSince(bobJob, STALE);
    const aliceJob = await harness.enqueue(harness.aliceId, 'alice-photo');

    await harness.graphql<Identified>(IDENTIFY, harness.aliceToken, {
      id: aliceJob,
    });

    const [row] = await harness.database
      .select({ status: recognitionJob.status })
      .from(recognitionJob)
      .where(eq(recognitionJob.id, bobJob));
    expect(row?.status).toBe('processing');
    expect(harness.storage.removed).toEqual([]);
  });

  it('fails a stale diagnosis and keeps the plant photo', async () => {
    const plantId = await harness.createPlant(harness.aliceId, 'plant-photo');
    const { diagnosePlant } = await harness.graphql<{
      diagnosePlant: { id: string };
    }>(
      'mutation ($plantId: ID!) { diagnosePlant(plantId: $plantId) { id } }',
      harness.aliceToken,
      { plantId },
    );
    await processingSince(diagnosePlant.id, STALE);

    const job = await harness.graphql<Diagnosed>(DIAGNOSE, harness.aliceToken, {
      id: diagnosePlant.id,
    });

    expect(job.diagnosisJob.status).toBe('FAILED');
    expect(harness.storage.removed).toEqual([]);
  });

  it('fails the jobs a worker left behind when it asks for work again', async () => {
    const { createWorkerToken } = await harness.graphql<{
      createWorkerToken: { token: string };
    }>(
      'mutation { createWorkerToken(label: "PC") { token } }',
      harness.aliceToken,
    );
    const jobId = await harness.enqueue(harness.aliceId, 'crashed-photo');
    await processingSince(jobId, STALE);

    const poll = await harness.worker('GET', NEXT_JOB, createWorkerToken.token);

    expect(poll.json<{ jobId?: string }>().jobId).toBeUndefined();
    const [row] = await harness.database
      .select({ status: recognitionJob.status })
      .from(recognitionJob)
      .where(eq(recognitionJob.id, jobId));
    expect(row?.status).toBe('failed');
    expect(harness.storage.removed).toEqual(['crashed-photo']);
  });

  // A worker token for alice, to report results the way the worker does.
  const aliceWorker = async (): Promise<string> => {
    const { createWorkerToken } = await harness.graphql<{
      createWorkerToken: { token: string };
    }>(
      'mutation { createWorkerToken(label: "PC") { token } }',
      harness.aliceToken,
    );
    return createWorkerToken.token;
  };

  const statusOf = async (id: string): Promise<string | undefined> => {
    const [row] = await harness.database
      .select({ status: recognitionJob.status })
      .from(recognitionJob)
      .where(eq(recognitionJob.id, id));
    return row?.status;
  };

  describe('a result that arrives after the sweep', () => {
    // Regression guard: the UPDATE guard (status = 'processing') existed before the sweep; this pins it, it was not proven red.
    it('is ignored: the job stays failed and the photo is removed only once', async () => {
      const bearer = await aliceWorker();
      const jobId = await harness.enqueue(harness.aliceId, 'late-photo');
      await processingSince(jobId, STALE);
      await harness.resolve(StaleJobSweeper).sweep(harness.aliceId);

      const late = await harness.worker(
        'POST',
        `/worker/jobs/${jobId}/result`,
        bearer,
        { species: 'Dionaea muscipula' },
      );

      expect(late.statusCode).toBeLessThan(500);
      expect(await statusOf(jobId)).toBe('failed');
      expect(harness.storage.removed).toEqual(['late-photo']);
    });

    // Regression guard: the UPDATE guard (status = 'processing') existed before the sweep; this pins it, it was not proven red.
    it('is ignored too when the worker reports a failure', async () => {
      const bearer = await aliceWorker();
      const jobId = await harness.enqueue(harness.aliceId, 'late-fail-photo');
      await processingSince(jobId, STALE);
      await harness.resolve(StaleJobSweeper).sweep(harness.aliceId);

      const late = await harness.worker(
        'POST',
        `/worker/jobs/${jobId}/failed`,
        bearer,
      );

      expect(late.statusCode).toBeLessThan(500);
      expect(await statusOf(jobId)).toBe('failed');
      expect(harness.storage.removed).toEqual(['late-fail-photo']);
    });
  });

  // Regression guard: the UPDATE guard (status = 'processing') existed before the sweep; this pins it, it was not proven red.
  it('gives each photo to one caller when sweeps run at once', async () => {
    const jobId = await harness.enqueue(harness.aliceId, 'raced-photo');
    await processingSince(jobId, STALE);
    const sweeper = harness.resolve(StaleJobSweeper);

    await Promise.all([
      sweeper.sweep(harness.aliceId),
      sweeper.sweep(harness.aliceId),
      sweeper.sweep(),
    ]);

    expect(harness.storage.removed).toEqual(['raced-photo']);
    expect(await statusOf(jobId)).toBe('failed');
  });

  it('fails a stale embed job, which has no photo to remove', async () => {
    const [created] = await harness.database
      .insert(recognitionJob)
      .values({
        userId: harness.aliceId,
        kind: JobKind.EMBED,
        inputText: 'a fern',
        status: RecognitionStatus.PROCESSING,
        updatedAt: STALE,
      })
      .returning({ id: recognitionJob.id });

    await harness.resolve(StaleJobSweeper).sweep(harness.aliceId);

    expect(await statusOf(created?.id ?? '')).toBe('failed');
    expect(harness.storage.removed).toEqual([]);
  });

  it('sweeps every user at once when no user is given', async () => {
    const alice = await harness.enqueue(harness.aliceId, 'a-photo');
    const bob = await harness.enqueue(harness.bobId, 'b-photo');
    await processingSince(alice, STALE);
    await processingSince(bob, STALE);

    await harness.resolve(StaleJobSweeper).sweep();

    expect(await statusOf(alice)).toBe('failed');
    expect(await statusOf(bob)).toBe('failed');
    expect([...harness.storage.removed].sort()).toEqual(['a-photo', 'b-photo']);
  });
});
