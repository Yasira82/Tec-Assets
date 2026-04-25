import { test, expect } from '@playwright/test';

test('homepage shows Assets branding', async ({ page }) => {
  await page.goto('/');
  // ✅ exact match للـ heading بس
  await expect(page.getByText('Assets', { exact: true }).first()).toBeVisible();
});

test('login button visible', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Login with Pi')).toBeVisible();
});
