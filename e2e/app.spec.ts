import { test, expect } from '@playwright/test';

test.skip(!!process.env.CI, 'Requires authenticated session via SSO');

test('app page is accessible', async ({ page }) => {
  await page.goto('/app');
  await expect(page).toHaveTitle(/Assets/);
});
