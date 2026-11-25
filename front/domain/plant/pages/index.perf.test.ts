import { type Locator, type Page, expect, test } from '@playwright/test';

// Time budgets of the home page (docs/plans/refactor-socle.md, "Performance lot"), with the
// CPU slowed x4 like a mid-range phone and the API answering in 100 ms: what is measured is
// the page's own cost (waterfall of requests, hydration, rendering), never the network.
//   - warm client-side navigation: plant cards visible <= 1 s (Nielsen 1 s, RAIL load);
//   - cold load: cards visible <= 2.5 s (LCP "good");
// Median over SAMPLES runs, never a single sample.
const WARM_BUDGET_MS = 1000;
const COLD_BUDGET_MS = 2500;
const SAMPLES = 10;
const API_LATENCY_MS = 100;
const CPU_SLOWDOWN = 4;
const DUE_PLANTS = 8;

const ME = {
  id: 'u1',
  name: 'Alice',
  email: 'alice@test.dev',
  avatarUrl: null,
  hasPlantnetKey: false,
};

const duePlants = Array.from({ length: DUE_PLANTS }, (_, index) => ({
  __typename: 'Plant',
  id: `p${index}`,
  name: `Plant ${index}`,
  species: 'Monstera deliciosa',
  imageUrl: null,
  nextDueOn: '2020-01-01',
}));

// The root field of the query (`{ plantsDue { ... } }`), never a substring of its text.
const rootField = (query: string): string => /\{\s*(\w+)/.exec(query)?.[1] ?? '';

const mockApi = async (page: Page): Promise<void> => {
  await page.route('**/graphql', async (route) => {
    const field = rootField(String(route.request().postDataJSON()?.query ?? ''));
    const answers: Record<string, unknown> = {
      plantsDue: { plantsDue: duePlants },
      googleEnabled: { googleEnabled: false },
      me: { me: ME },
    };
    // A realistic answer time (well under the 300 ms API budget), so that two requests made one
    // after the other cost twice as much as two made together.
    await new Promise((resolve) => setTimeout(resolve, API_LATENCY_MS));
    await route.fulfill({ json: { data: answers[field] ?? {} } });
  });
};

const slowDownCpu = async (page: Page): Promise<void> => {
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setCPUThrottlingRate', { rate: CPU_SLOWDOWN });
};

const median = (values: number[]): number =>
  [...values].sort((first, second) => first - second)[Math.floor(values.length / 2)] ?? 0;

const dueCards = (page: Page): Locator =>
  page.locator('section[aria-labelledby="today-band-title"] li');

test.describe('home page time budgets', () => {
  test.setTimeout(120_000);

  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await slowDownCpu(page);
  });

  test(`cold load shows the plants within ${COLD_BUDGET_MS} ms (median)`, async ({ page }) => {
    const durations: number[] = [];
    for (let run = 0; run < SAMPLES; run += 1) {
      const startedAt = Date.now();
      await page.goto('/');
      await expect(dueCards(page)).toHaveCount(DUE_PLANTS, { timeout: 10_000 });
      durations.push(Date.now() - startedAt);
    }
    console.info(`[perf] home cold median ${median(durations)} ms`);
    expect(median(durations)).toBeLessThan(COLD_BUDGET_MS);
  });

  test(`warm navigation shows the plants within ${WARM_BUDGET_MS} ms (median)`, async ({
    page,
  }) => {
    await page.goto('/');
    await expect(dueCards(page)).toHaveCount(DUE_PLANTS, { timeout: 10_000 });
    const durations: number[] = [];
    for (let run = 0; run < SAMPLES; run += 1) {
      await page.goto('/confidentialite');
      const startedAt = Date.now();
      await page.locator('a.brand').click();
      await expect(dueCards(page)).toHaveCount(DUE_PLANTS, { timeout: 10_000 });
      durations.push(Date.now() - startedAt);
    }
    console.info(`[perf] home warm median ${median(durations)} ms`);
    expect(median(durations)).toBeLessThan(WARM_BUDGET_MS);
  });
});
