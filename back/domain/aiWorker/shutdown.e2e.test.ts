import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AiWorkerTestHarness } from './harness';
import { RecognitionJobRepository } from './job/repository';

describe('stopping the server during a worker long poll (e2e)', () => {
  const harness = new AiWorkerTestHarness();

  beforeAll(() => harness.init());
  // The app is closed by the test itself.
  afterAll(() => undefined);

  it('answers a held poll empty instead of holding the shutdown', async () => {
    const { createWorkerToken } = await harness.graphql<{
      createWorkerToken: { token: string };
    }>(
      'mutation { createWorkerToken(label: "PC maison") { id token } }',
      harness.aliceToken,
    );
    const claims = vi.spyOn(
      harness.resolve(RecognitionJobRepository),
      'claimNext',
    );
    const poll = harness.worker(
      'GET',
      '/worker/next-job',
      createWorkerToken.token,
    );
    await vi.waitFor(() => expect(claims).toHaveBeenCalled());

    await harness.close();

    const answer = await poll;
    expect(answer.statusCode).toBe(200);
    expect(answer.json()).toEqual({});
  }, 10_000);
});
