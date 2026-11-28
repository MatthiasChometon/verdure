import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AiWorkerTestHarness } from './harness';

type NextJob = {
  jobId?: string;
  kind?: string;
  image?: string;
  contentType?: string;
};
type Enqueued = {
  diagnosePlant: { id: string; status: string; diagnosis: string | null };
};
type Job = { diagnosisJob: { status: string; diagnosis: string | null } };

const NEXT_JOB = '/worker/next-job';
const DIAGNOSE =
  'mutation ($plantId: ID!) { diagnosePlant(plantId: $plantId) { id status diagnosis } }';
const JOB_STATUS =
  'query ($id: ID!) { diagnosisJob(id: $id) { status diagnosis } }';

describe('plant diagnosis worker channel (e2e)', () => {
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
      createWorkerToken: { token: string };
    }>(
      'mutation { createWorkerToken(label: "PC maison") { token } }',
      harness.aliceToken,
    );
    token = createWorkerToken.token;
  });

  it('runs a diagnosis through claim -> result and keeps the plant photo', async () => {
    const plantId = await harness.createPlant(harness.aliceId, 'plant-photo');

    const enqueued = await harness.graphql<Enqueued>(
      DIAGNOSE,
      harness.aliceToken,
      {
        plantId,
      },
    );
    expect(enqueued.diagnosePlant.status).toBe('PENDING');
    const jobId = enqueued.diagnosePlant.id;

    const claimed = (
      await harness.worker('GET', NEXT_JOB, token)
    ).json<NextJob>();
    expect(claimed.jobId).toBe(jobId);
    expect(claimed.kind).toBe('diagnose');
    expect(claimed.image).toBeTypeOf('string');

    const processing = await harness.graphql<Job>(
      JOB_STATUS,
      harness.aliceToken,
      {
        id: jobId,
      },
    );
    expect(processing.diagnosisJob.status).toBe('PROCESSING');

    const result = await harness.worker(
      'POST',
      `/worker/jobs/${jobId}/diagnosis`,
      token,
      {
        diagnosis:
          'Yellowing lower leaves likely from overwatering. Let the soil dry out.',
      },
    );
    expect(result.statusCode).toBe(204);

    const done = await harness.graphql<Job>(JOB_STATUS, harness.aliceToken, {
      id: jobId,
    });
    expect(done.diagnosisJob.status).toBe('DONE');
    expect(done.diagnosisJob.diagnosis).toContain('overwatering');
    // The photo belongs to the plant, so it is never removed.
    expect(harness.storage.removed).not.toContain('plant-photo');
  });

  describe('a finished diagnosis', () => {
    const finishedDiagnosis = async (): Promise<string> => {
      const plantId = await harness.createPlant(harness.aliceId, 'plant-photo');
      const { diagnosePlant } = await harness.graphql<Enqueued>(
        DIAGNOSE,
        harness.aliceToken,
        { plantId },
      );
      await harness.worker('GET', NEXT_JOB, token);
      await harness.worker(
        'POST',
        `/worker/jobs/${diagnosePlant.id}/diagnosis`,
        token,
        { diagnosis: 'Overwatering.' },
      );
      return diagnosePlant.id;
    };

    const stateOf = async (id: string): Promise<Job['diagnosisJob']> =>
      (await harness.graphql<Job>(JOB_STATUS, harness.aliceToken, { id }))
        .diagnosisJob;

    it('is not overwritten by a second result', async () => {
      const jobId = await finishedDiagnosis();

      await harness.worker('POST', `/worker/jobs/${jobId}/diagnosis`, token, {
        diagnosis: 'Something else entirely.',
      });

      expect(await stateOf(jobId)).toEqual({
        status: 'DONE',
        diagnosis: 'Overwatering.',
      });
    });

    it('is not flipped to failed by a late failure report', async () => {
      const jobId = await finishedDiagnosis();

      await harness.worker(
        'POST',
        `/worker/jobs/${jobId}/diagnosis-failed`,
        token,
      );

      expect(await stateOf(jobId)).toEqual({
        status: 'DONE',
        diagnosis: 'Overwatering.',
      });
    });
  });

  it('refuses to diagnose a plant that has no photo', async () => {
    const plantId = await harness.createPlant(harness.aliceId, null);

    const response = await harness.graphqlRaw(DIAGNOSE, harness.aliceToken, {
      plantId,
    });
    expect(response.errors).toBeDefined();
  });

  it("never diagnoses another user's plant", async () => {
    const plantId = await harness.createPlant(harness.bobId, 'bob-photo');

    const response = await harness.graphqlRaw(DIAGNOSE, harness.aliceToken, {
      plantId,
    });
    expect(response.errors).toBeDefined();
  });
});
