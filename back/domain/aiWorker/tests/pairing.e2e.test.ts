import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AiWorkerTestHarness } from './harness';

const APPROVE = `
  mutation ($code: String!) {
    approvePairing(code: $code)
  }
`;
const DENY = `
  mutation ($code: String!) {
    denyPairing(code: $code)
  }
`;

type StartResponse = { code: string; secret: string; verifyUrl: string };

describe('worker pairing (e2e)', () => {
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

  const start = async (): Promise<StartResponse> => {
    const response = await harness.worker('POST', '/worker/pair/start', 'none', {
      label: 'Home PC',
    });
    return response.json<StartResponse>();
  };

  const poll = (secret: string) =>
    harness
      .worker('POST', '/worker/pair/poll', 'none', { secret })
      .then((response) => response.json<{ status: string; token?: string | null }>());

  it('pairs hands-free: start → user approves → worker collects a working token', async () => {
    const { code, secret, verifyUrl } = await start();
    expect(code).toHaveLength(8);
    expect(verifyUrl).toContain(`code=${code}`);

    // The worker sees nothing until the user acts.
    expect(await poll(secret)).toEqual({ status: 'pending' });

    // Alice approves the code from the web.
    const approved = await harness.graphql<{ approvePairing: boolean }>(
      APPROVE,
      harness.aliceToken,
      { code },
    );
    expect(approved.approvePairing).toBe(true);

    // The worker collects its token exactly once.
    const collected = await poll(secret);
    expect(collected.status).toBe('approved');
    expect(collected.token).toMatch(/^vwk_/);
    expect((await poll(secret)).token).toBeNull();

    // And the token actually authenticates the worker channel, bound to Alice.
    const nextJob = await harness.worker(
      'GET',
      '/worker/next-job',
      collected.token as string,
    );
    expect(nextJob.statusCode).toBe(200);
  });

  it('reports denied when the user refuses', async () => {
    const { code, secret } = await start();
    await harness.graphql(DENY, harness.aliceToken, { code });
    expect((await poll(secret)).status).toBe('denied');
  });

  it('treats an unknown secret as expired, so the worker re-pairs', async () => {
    expect((await poll('deadbeef')).status).toBe('expired');
  });

  it('refuses to approve an unknown code', async () => {
    const approved = await harness.graphql<{ approvePairing: boolean }>(
      APPROVE,
      harness.aliceToken,
      { code: 'ZZZZZZZZ' },
    );
    expect(approved.approvePairing).toBe(false);
  });
});
