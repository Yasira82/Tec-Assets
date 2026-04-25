import { test, expect } from '@playwright/test';

test('homepage shows Assets branding', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('text=Assets')).toBeVisible();
});

test('login button visible', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Login with Pi')).toBeVisible();
});
