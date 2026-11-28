import { type Page, expect, test } from '@playwright/test';

// A plant's page must not move once the user sees it: the skeleton reserves the final size of the
// hero, the bio, the care sheet and the schedules, and the photo has its own box. The same budget
// as Lighthouse (CLS "good" <= 0.1), measured here on the slow, staggered answers of a real API:
// the plant first, the schedules, journal and photo later, so that every late block is exercised.
const CLS_BUDGET = 0.1;
const PLANT_ID = '10000000-0000-4000-8000-000000000001';
const PHOTO_URL = '/plant-photo.png';
// 1x1 transparent PNG: the box comes from the page's CSS, never from the file.
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

const ME = {
  id: 'u1',
  name: 'Alice',
  email: 'alice@test.dev',
  avatarUrl: null,
  hasPlantnetKey: false,
};

const PLANT = {
  __typename: 'Plant',
  id: PLANT_ID,
  name: 'Monstera',
  species: 'Monstera deliciosa',
  description: 'In the living room, by the window.',
  imageUrl: PHOTO_URL,
  wateringIntervalSummerDays: 7,
  wateringIntervalWinterDays: 14,
  lastWateredOn: '2020-01-01',
  nextDueOn: '2020-01-08',
  speciesInfo: {
    description: 'A climbing aroid from the rainforests of Central America, known for its leaves.',
    origin: 'Mexico',
  },
  careSheet: { light: 'MEDIUM', humidity: 'HIGH', tip: 'Wipe the leaves now and then.' },
  wateringHistory: [{ id: 'w1', wateredOn: '2020-01-01' }],
};

// The delay of each answer, by root field: the plant arrives first, the rest after it.
const ANSWERS: Record<string, { delay: number; data: unknown }> = {
  me: { delay: 100, data: { me: ME } },
  googleEnabled: { delay: 100, data: { googleEnabled: false } },
  plant: { delay: 250, data: { plant: PLANT } },
  careSchedules: { delay: 600, data: { careSchedules: [] } },
  journalEntries: { delay: 900, data: { journalEntries: [] } },
  wateringEvents: { delay: 700, data: { wateringEvents: [] } },
};

const rootField = (query: string): string => /\{\s*(\w+)/.exec(query)?.[1] ?? '';

const mockApi = async (page: Page): Promise<void> => {
  await page.route('**/graphql', async (route) => {
    const answer = ANSWERS[rootField(String(route.request().postDataJSON()?.query ?? ''))];
    await new Promise((resolve) => setTimeout(resolve, answer?.delay ?? 100));
    await route.fulfill({ json: { data: answer?.data ?? {} } });
  });
  await page.route(`**${PHOTO_URL}`, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.fulfill({ body: PIXEL, contentType: 'image/png' });
  });
};

// The layout-shift entries that Lighthouse also counts (not caused by a recent user input).
const observeLayoutShifts = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    const shifts: { value: number; sources: string[] }[] = [];
    (window as unknown as { __shifts: typeof shifts }).__shifts = shifts;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as unknown as {
        value: number;
        hadRecentInput: boolean;
        sources?: { node?: Element }[];
      }[]) {
        if (entry.hadRecentInput) continue;
        const sources = (entry.sources ?? []).map(
          (source) => source.node?.tagName.toLowerCase() + '.' + (source.node?.className ?? ''),
        );
        shifts.push({ value: entry.value, sources });
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
};

test.describe('plant page layout stability', () => {
  test.setTimeout(60_000);

  test(`cumulative layout shift stays within ${CLS_BUDGET} while the blocks load`, async ({
    page,
  }) => {
    await mockApi(page);
    await observeLayoutShifts(page);

    await page.goto(`/en/plant/${PLANT_ID}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Monstera' })).toBeVisible({
      timeout: 15_000,
    });
    // Every late answer (schedules, journal, calendar, photo) has landed.
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1_500);

    const shifts = await page.evaluate(
      () => (window as unknown as { __shifts: { value: number; sources: string[] }[] }).__shifts,
    );
    const total = shifts.reduce((sum, shift) => sum + shift.value, 0);
    console.info(`[perf] plant page CLS ${total.toFixed(3)} ${JSON.stringify(shifts)}`);
    expect(total).toBeLessThan(CLS_BUDGET);
  });
});

test.describe('plant page deferred sections', () => {
  test.setTimeout(60_000);

  test('the first click on a section that renders on scroll works at once', async ({ page }) => {
    await mockApi(page);

    await page.goto(`/en/plant/${PLANT_ID}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Monstera' })).toBeVisible({
      timeout: 15_000,
    });
    // The care section waits for the viewport; scroll to its reserved place and click the first
    // button it draws, with no pause in between.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    const track = page.getByRole('button', { name: 'Track' }).first();
    await track.click({ timeout: 10_000 });

    await expect(page.getByRole('dialog')).toBeVisible();
  });
});
