import { expect, test } from '@playwright/test';

const gotoPlantList = async (
  page: import('@playwright/test').Page,
  colorScheme: 'light' | 'dark',
): Promise<void> => {
  await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
  await page.goto('/');
  // Plants are private: an anonymous visitor lands on the sign-in prompt (client-rendered).
  await page.getByText('Your garden is private').waitFor();
  await page.waitForLoadState('networkidle');
};

test.describe('plant list page', () => {
  test('matches the light-mode baseline', async ({ page }) => {
    await gotoPlantList(page, 'light');
    await expect(page).toHaveScreenshot('plant-list-light.png', { fullPage: true });
  });

  test('matches the dark-mode baseline', async ({ page }) => {
    await gotoPlantList(page, 'dark');
    await expect(page).toHaveScreenshot('plant-list-dark.png', { fullPage: true });
  });
});
