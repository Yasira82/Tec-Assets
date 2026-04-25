import { test, expect } from '@playwright/test';

// ✅ E2E يحتاج authenticated session — run locally only
test.skip(!!process.env.CI, 'Requires authenticated session via SSO');

test('assets page loads for authenticated user', async ({ page }) => {
  await page.goto('/app');
  await expect(page.getByText('Portfolio')).toBeVisible();
});

test('domains tab works', async ({ page }) => {
  await page.goto('/app');
  await page.getByText('Domains').click();
  await expect(page.getByText('🌐 Domains')).toBeVisible();
});
