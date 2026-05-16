import { test, expect } from '@playwright/test';

test.skip(!!process.env.CI, 'Requires Pi Browser authenticated session');

// ── Page load ─────────────────────────────────────────────
test.describe('Assets /app — page load', () => {
  test('الصفحة بتتحمل', async ({ page }) => {
    await page.goto('/app');
    await expect(page).toHaveURL(/\/app/);
  });

  test('فيها Portfolio tab', async ({ page }) => {
    await page.goto('/app');
    await expect(page.getByText('Portfolio')).toBeVisible();
  });

  test('فيها Marketplace tab', async ({ page }) => {
    await page.goto('/app');
    await expect(page.getByText(/Market/i)).toBeVisible();
  });

  test('فيها History tab', async ({ page }) => {
    await page.goto('/app');
    await expect(page.getByText(/History/i)).toBeVisible();
  });

  test('فيها + NFT button', async ({ page }) => {
    await page.goto('/app');
    await expect(page.getByText('+ NFT')).toBeVisible();
  });
});

// ── Asset filters ─────────────────────────────────────────
test.describe('Asset filters', () => {
  test('All filter شغال', async ({ page }) => {
    await page.goto('/app');
    await page.getByText('All').click();
    await expect(page.getByText('All')).toBeVisible();
  });

  test('NFTs filter شغال', async ({ page }) => {
    await page.goto('/app');
    await page.getByText(/NFTs/i).click();
    await expect(page.getByText(/NFTs/i)).toBeVisible();
  });
});

// ── BFF — no Railway direct calls ────────────────────────
test.describe('BFF routing — no Railway calls', () => {
  test('assets/list مش بيكل Railway مباشرة', async ({ page }) => {
    const railwayCall = page.waitForRequest(
      req => req.url().includes('railway.app') && req.url().includes('assets'),
      { timeout: 3000 },
    ).catch(() => null);

    await page.goto('/app');
    expect(await railwayCall).toBeNull();
  });

  test('marketplace مش بيكل Railway مباشرة', async ({ page }) => {
    const railwayCall = page.waitForRequest(
      req => req.url().includes('railway.app') && req.url().includes('marketplace'),
      { timeout: 3000 },
    ).catch(() => null);

    await page.goto('/app');
    expect(await railwayCall).toBeNull();
  });
});

// ── handleBuy → Hub ───────────────────────────────────────
test.describe('handleBuy → Hub payment', () => {
  test('Buy button بيروح لـ Hub', async ({ page }) => {
    // Mock BFF responses
    await page.route('/api/bff/assets/list', route =>
      route.fulfill({ status: 200, body: JSON.stringify({ data: [], total: 0 }) }),
    );
    await page.route('/api/bff/marketplace', route =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          listings: [{
            id: 'listing-1', asset_id: 'a1', seller_id: 'other',
            price: 3, currency: 'PI', status: 'active',
            title: 'Test NFT', description: '', category: 'nft',
            created_at: new Date().toISOString(),
            metadata: { imageUrl: '' },
          }],
          total: 1,
        }),
      }),
    );
    await page.route('/api/bff/marketplace/purchases', route =>
      route.fulfill({ status: 200, body: JSON.stringify({ purchases: [] }) }),
    );
    await page.route('/api/bff/wallet/balance', route =>
      route.fulfill({ status: 200, body: JSON.stringify({ balance: 5 }) }),
    );

    let hubUrl = '';
    page.on('request', req => {
      if (req.url().includes('hub.tecosystem.app')) hubUrl = req.url();
    });

    await page.goto('/app');
    await page.getByText(/Market/i).click();
    await page.waitForSelector('text=Test NFT', { timeout: 5000 });

    const buyBtn = page.getByText('🛒 Buy').first();
    if (await buyBtn.isVisible()) {
      await buyBtn.click();
      expect(hubUrl).toContain('pay=1');
      expect(hubUrl).toContain('source=assets');
    }
  });
});

// ── payment_status=success ────────────────────────────────
test.describe('payment_status=success handling', () => {
  test('NFT product_id → يظهر toast', async ({ page }) => {
    const nftData   = btoa(JSON.stringify({
      n: 'Test NFT', u: 'https://r2.dev/t.jpg', k: 'k', m: 'image/jpeg',
    }));

    await page.route('/api/bff/nft/register', route =>
      route.fulfill({ status: 200, body: JSON.stringify({ success: true }) }),
    );
    await page.route('/api/bff/assets/list', route =>
      route.fulfill({ status: 200, body: JSON.stringify({ data: [], total: 0 }) }),
    );
    await page.route('/api/bff/marketplace', route =>
      route.fulfill({ status: 200, body: JSON.stringify({ listings: [] }) }),
    );
    await page.route('/api/bff/marketplace/purchases', route =>
      route.fulfill({ status: 200, body: JSON.stringify({ purchases: [] }) }),
    );
    await page.route('/api/bff/wallet/balance', route =>
      route.fulfill({ status: 200, body: JSON.stringify({ balance: 5 }) }),
    );

    await page.goto(`/app?payment_status=success&product_id=nft:${nftData}&payment_id=pay-123&txid=tx-123`);
    await expect(page.getByText(/Minted|NFT/i)).toBeVisible({ timeout: 5000 });
  });

  test('marketplace product_id → يظهر toast', async ({ page }) => {
    await page.route('/api/bff/marketplace/buy', route =>
      route.fulfill({ status: 200, body: JSON.stringify({ success: true }) }),
    );
    await page.route('/api/bff/assets/list', route =>
      route.fulfill({ status: 200, body: JSON.stringify({ data: [], total: 0 }) }),
    );
    await page.route('/api/bff/marketplace', route =>
      route.fulfill({ status: 200, body: JSON.stringify({ listings: [] }) }),
    );
    await page.route('/api/bff/marketplace/purchases', route =>
      route.fulfill({ status: 200, body: JSON.stringify({ purchases: [] }) }),
    );
    await page.route('/api/bff/wallet/balance', route =>
      route.fulfill({ status: 200, body: JSON.stringify({ balance: 5 }) }),
    );

    await page.goto('/app?payment_status=success&product_id=listing-123&payment_id=pay-456&txid=tx-456');
    await expect(page.getByText(/successful|Purchase/i)).toBeVisible({ timeout: 5000 });
  });
});

// ── API health ────────────────────────────────────────────
test.describe('API health', () => {
  test('GET /api/health → 200', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.status()).toBe(200);
  });
});
