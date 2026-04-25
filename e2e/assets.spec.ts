import { test, expect } from '@playwright/test';

test('homepage shows Assets branding', async ({ page }) => {
  await page.goto('/');
  // ✅ بيظهر Loading screen قبل الـ SSO redirect
  await expect(page.getByText('Assets', { exact: true }).first()).toBeVisible();
});

test('homepage shows connecting message', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Connecting to TEC...')).toBeVisible();
});
