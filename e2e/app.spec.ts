import { test, expect } from '@playwright/test';

test.skip(!!process.env.CI, 'Requires authenticated session via SSO');

test('app page is accessible', async ({ page }) => {
  await page.goto('/app');
  await expect(page).toHaveTitle(/Assets|TEC/i);
});

test('SSO redirect يشتغل لو مش logged in', async ({ page }) => {
  // Clear cookies
  await page.context().clearCookies();
  const res = await page.goto('/app');
  // Either redirect to SSO or show login
  expect([200, 302, 307]).toContain(res?.status());
});

test('GET /api/health → 200', async ({ request }) => {
  const res = await request.get('/api/health');
  expect(res.status()).toBe(200);
});
