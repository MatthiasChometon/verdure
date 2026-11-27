import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { AiWorkerTestHarness } from './harness';
import { RecognitionStatus } from './job/enum';
import { recognitionJob } from './job/schema';

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
});
