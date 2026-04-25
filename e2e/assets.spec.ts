import { test, expect } from '@playwright/test';

test('unauthenticated user redirects to SSO', async ({ page }) => {
  await page.route('https://tec-app.vercel.app/**', route => route.abort());
  await page.goto('/');
  await expect(page).toHaveURL(/tec-app\.vercel\.app|tec-assets/);
});

test('page title is correct', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Assets/);
});
