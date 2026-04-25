import { test, expect } from '@playwright/test';

test('homepage loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Assets/);
});

test('homepage shows loading state', async ({ page }) => {
  await page.goto('/');
  // ✅ Loading screen أو SSO redirect
  const hasAssets     = await page.getByText('Assets').isVisible().catch(() => false);
  const hasConnecting = await page.getByText('Connecting').isVisible().catch(() => false);
  expect(hasAssets || hasConnecting).toBe(true);
});
