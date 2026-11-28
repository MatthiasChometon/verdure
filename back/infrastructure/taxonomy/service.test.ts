import { HttpService } from '@nestjs/axios';
import { AxiosError, type AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';
import { TaxonomyService } from './service';

const page = (
  results: { key: number; canonicalName?: string }[],
): AxiosResponse =>
  ({
    data: { results, endOfRecords: true },
    status: 200,
  }) as AxiosResponse;

const replied = (
  status: number,
  headers: Record<string, string> = {},
): AxiosError =>
  new AxiosError('failed', String(status), undefined, undefined, {
    status,
    headers,
  } as never);

// The families call, then one species call per family: `answers` are consumed in
// order, and an exhausted script answers an empty last page.
const serviceAnswering = (
  answers: (AxiosResponse | AxiosError)[],
): { service: TaxonomyService; calls: () => number; sleeps: number[] } => {
  let calls = 0;
  const sleeps: number[] = [];
  const http = {
    get: () => {
      const answer = answers[calls] ?? page([]);
      calls += 1;
      return answer instanceof AxiosError
        ? throwError(() => answer)
        : of(answer);
    },
  } as unknown as HttpService;
  const service = new TaxonomyService(http);
  service.retryOptions = {
    random: () => 0.5,
    sleep: (ms: number): Promise<void> => {
      sleeps.push(ms);
      return Promise.resolve();
    },
  };
  return { service, calls: () => calls, sleeps };
};

describe('the GBIF sweep', () => {
  it('asks again after a 503 and carries on', async () => {
    const { service, sleeps } = serviceAnswering([
      replied(503),
      page([{ key: 1 }]),
      page([{ key: 10, canonicalName: 'Ficus lyrata' }]),
    ]);
    const batches: unknown[] = [];

    await service.sweepPlantSpecies((matches) => {
      batches.push(matches);
      return Promise.resolve();
    });

    expect(batches).toEqual([[{ key: 10, name: 'Ficus lyrata' }]]);
    expect(sleeps).toEqual([500]);
  });

  it('waits what GBIF asks for through Retry-After, up to the cap', async () => {
    const { service, sleeps } = serviceAnswering([
      replied(429, { 'retry-after': '2' }),
      page([]),
    ]);

    await service.sweepPlantSpecies(() => Promise.resolve());

    expect(sleeps).toEqual([2000]);
  });

  it('gives up after five attempts', async () => {
    const { service, calls } = serviceAnswering(
      Array.from({ length: 6 }, () => replied(503)),
    );

    await expect(
      service.sweepPlantSpecies(() => Promise.resolve()),
    ).rejects.toBeInstanceOf(AxiosError);
    expect(calls()).toBe(5);
  });

  it.each([400, 404, 500])('does not ask again after a %i', async (status) => {
    const { service, calls } = serviceAnswering([
      replied(status),
      replied(status),
    ]);

    await expect(
      service.sweepPlantSpecies(() => Promise.resolve()),
    ).rejects.toBeInstanceOf(AxiosError);
    expect(calls()).toBe(1);
  });
});
