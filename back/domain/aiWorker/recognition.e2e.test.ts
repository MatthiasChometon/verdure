import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AiWorkerTestHarness } from './harness';

type NextJob = { jobId?: string; image?: string; contentType?: string };
type Job = { identificationJob: { status: string; species: string | null } };

const NEXT_JOB = '/worker/next-job';
const JOB_STATUS =
  'query ($id: ID!) { identificationJob(id: $id) { status species } }';

describe('recognition worker channel (e2e)', () => {
  const harness = new AiWorkerTestHarness();
  let token: string;

  beforeAll(async () => {
    await harness.init();
  });

  afterAll(async () => {
    await harness.close();
  });

  beforeEach(async () => {
    await harness.reset();
    const { createWorkerToken } = await harness.graphql<{
      createWorkerToken: { id: string; token: string };
    }>(
      'mutation { createWorkerToken(label: "PC maison") { id token } }',
      harness.aliceToken,
    );
    token = createWorkerToken.token;
  });

  it('marks the user online once its worker phones home', async () => {
    await harness.enqueue(harness.aliceId);

    const before = await harness.graphql<{ aiWorkerOnline: boolean }>(
      '{ aiWorkerOnline }',
      harness.aliceToken,
    );
    expect(before.aiWorkerOnline).toBe(false);

    const claim = await harness.worker('GET', NEXT_JOB, token);
    expect(claim.statusCode).toBe(200);
    expect(claim.json<NextJob>().jobId).toBeTypeOf('string');

    const after = await harness.graphql<{ aiWorkerOnline: boolean }>(
      '{ aiWorkerOnline }',
      harness.aliceToken,
    );
    expect(after.aiWorkerOnline).toBe(true);
  });

  it('runs a job through claim -> result and cleans up the image', async () => {
    const jobId = await harness.enqueue(harness.aliceId, 'photo-1');

    const claimed = (await harness.worker('GET', NEXT_JOB, token)).json<NextJob>();
    expect(claimed.jobId).toBe(jobId);
    expect(claimed.image).toBeTypeOf('string');
    expect(claimed.contentType).toBe('image/jpeg');

    const processing = await harness.graphql<Job>(JOB_STATUS, harness.aliceToken, {
      id: jobId,
    });
    expect(processing.identificationJob.status).toBe('PROCESSING');

    const result = await harness.worker('POST', `/worker/jobs/${jobId}/result`, token, {
      species: 'Dionaea muscipula clone',
    });
    expect(result.statusCode).toBe(201);
    expect(result.json()).toEqual({ species: 'Dionaea muscipula' });

    const done = await harness.graphql<Job>(JOB_STATUS, harness.aliceToken, {
      id: jobId,
    });
    expect(done.identificationJob.status).toBe('DONE');
    expect(done.identificationJob.species).toBe('Dionaea muscipula');
    expect(harness.storage.removed).toContain('photo-1');
  });

  it("never hands a user's job to another user's worker", async () => {
    await harness.enqueue(harness.aliceId);
    const { createWorkerToken } = await harness.graphql<{
      createWorkerToken: { token: string };
    }>('mutation { createWorkerToken { token } }', harness.bobToken);

    const claim = await harness.worker('GET', NEXT_JOB, createWorkerToken.token);
    expect(claim.statusCode).toBe(200);
    expect(claim.json()).toEqual({});
  });

  it('rejects an unknown or revoked token', async () => {
    const unknown = await harness.worker('GET', NEXT_JOB, 'vwk_nope');
    expect(unknown.statusCode).toBe(401);

    const { workerTokens } = await harness.graphql<{
      workerTokens: { id: string }[];
    }>('{ workerTokens { id } }', harness.aliceToken);
    await harness.graphql(
      'mutation ($id: ID!) { revokeWorkerToken(id: $id) }',
      harness.aliceToken,
      { id: workerTokens[0].id },
    );

    const revoked = await harness.worker('GET', NEXT_JOB, token);
    expect(revoked.statusCode).toBe(401);
  });
});
