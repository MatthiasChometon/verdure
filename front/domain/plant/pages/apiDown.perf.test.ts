import { type Page, expect, test } from '@playwright/test';

// A failed API call must be cheap: if the API is down, every visitor pays for the failure path,
// so it may not cost the main thread more than a 50 ms task (the long-task threshold) over a
// visit where the API answers. CPU x4 like a mid-range phone; the difference of the time spent
// in long tasks between "API unreachable" and "API answers at once" is taken per pair of
// visits, and the median of the pairs is checked.
const PAIRS = 5;
const CPU_SLOWDOWN = 4;
const LONG_TASK_MS = 50;
const SETTLE_MS = 4000;

type LongTask = { startTime: number; duration: number };

const answerAtOnce = async (page: Page): Promise<void> => {
  await page.route('**/graphql', (route) =>
    route.fulfill({ json: { data: { me: null, googleEnabled: false } } }),
  );
};

const refuse = async (page: Page): Promise<void> => {
  await page.route('**/graphql', (route) => route.abort('connectionrefused'));
};

const longTaskTime = async (
  page: Page,
  answerApi: (page: Page) => Promise<void>,
): Promise<number> => {
  await answerApi(page);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_SLOWDOWN });
  await page.addInitScript(() => {
    const tasks: LongTask[] = [];
    (window as unknown as { __longTasks: LongTask[] }).__longTasks = tasks;
    new PerformanceObserver((list) => {
      for (const { startTime, duration } of list.getEntries()) tasks.push({ startTime, duration });
    }).observe({ type: 'longtask', buffered: true });
  });
  await page.goto('/conditions', { waitUntil: 'load' });
  await page.waitForTimeout(SETTLE_MS);
  const tasks = await page.evaluate(
    () => (window as unknown as { __longTasks: LongTask[] }).__longTasks,
  );
  return tasks.reduce((total, { duration }) => total + Math.max(0, duration - LONG_TASK_MS), 0);
};

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

test('a failed API call adds no long task over a call that answers', async ({ browser }) => {
  test.setTimeout(PAIRS * 2 * (SETTLE_MS + 6000));
  const extra: number[] = [];
  for (let pair = 0; pair < PAIRS; pair += 1) {
    const down = await (await browser.newContext()).newPage();
    const up = await (await browser.newContext()).newPage();
    const withFailure = await longTaskTime(down, refuse);
    const withAnswer = await longTaskTime(up, answerAtOnce);
    extra.push(withFailure - withAnswer);
    await down.context().close();
    await up.context().close();
  }
  expect(median(extra)).toBeLessThanOrEqual(LONG_TASK_MS);
});
