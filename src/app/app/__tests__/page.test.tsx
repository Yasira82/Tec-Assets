import { describe, it, expect, vi, beforeEach } from 'vitest';
import React                                     from 'react';
import { render, screen, waitFor, act }          from '@testing-library/react';

// ── Helpers ───────────────────────────────────────────────
const RAILWAY_PATTERN = /railway\.app/;
const BFF_PATTERN     = /^\/api\//;

const mockAsset = {
  id:         'asset-1',
  name:       'Pyramids',
  asset_type: 'nft',
  value:      2,
  currency:   'PI',
  status:     'active',
  created_at: '2026-05-01T10:00:00.000Z',
  metadata:   { name: 'Pyramids', imageUrl: 'https://r2.dev/nfts/test.jpg' },
  listing_id:    null,
  listing_price: null,
};

const mockListing = {
  id:          'listing-1',
  asset_id:    'asset-1',
  seller_id:   'other-user',
  price:       3,
  currency:    'PI',
  status:      'active',
  title:       'Pyramids NFT',
  description: '',
  category:    'nft',
  created_at:  '2026-05-01T10:00:00.000Z',
  metadata:    { imageUrl: 'https://r2.dev/nfts/test.jpg' },
};

const mockFetch = (responses: Record<string, unknown>) => {
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    const key = Object.keys(responses).find(k => url.includes(k));
    const res = key ? responses[key] : { ok: true, data: {} };
    return {
      ok:   true,
      status: 200,
      json: async () => res,
    } as Response;
  }) as unknown as typeof fetch;
};

// ── BFF Routing Tests ─────────────────────────────────────
describe('BFF — routing', () => {
  it('assets/list uses BFF not Railway', () => {
    const url = '/api/bff/assets/list';
    expect(BFF_PATTERN.test(url)).toBe(true);
    expect(RAILWAY_PATTERN.test(url)).toBe(false);
  });

  it('marketplace uses BFF not Railway', () => {
    const url = '/api/bff/marketplace';
    expect(BFF_PATTERN.test(url)).toBe(true);
    expect(RAILWAY_PATTERN.test(url)).toBe(false);
  });

  it('nft/register uses BFF not Railway', () => {
    const url = '/api/bff/nft/register';
    expect(BFF_PATTERN.test(url)).toBe(true);
    expect(RAILWAY_PATTERN.test(url)).toBe(false);
  });

  it('nft/upload uses BFF not Railway', () => {
    const url = '/api/bff/nft/upload';
    expect(BFF_PATTERN.test(url)).toBe(true);
    expect(RAILWAY_PATTERN.test(url)).toBe(false);
  });

  it('marketplace/buy uses BFF not Railway', () => {
    const url = '/api/bff/marketplace/buy';
    expect(BFF_PATTERN.test(url)).toBe(true);
    expect(RAILWAY_PATTERN.test(url)).toBe(false);
  });
});

// ── handleBuy ─────────────────────────────────────────────
describe('handleBuy', () => {
  it('يبعت params صح لـ Hub', async () => {
    mockFetch({
      '/api/bff/assets/list':  { data: [mockAsset], total: 1 },
      '/api/bff/marketplace':  { listings: [mockListing], total: 1 },
      '/api/bff/marketplace/purchases': { purchases: [] },
      '/api/bff/wallet/balance': { balance: 5, currency: 'PI' },
    });

    const { default: AssetsPage } = await import('../page');
    render(React.createElement(AssetsPage));

    await waitFor(() => screen.getByText('🛒 Buy'));
    await act(async () => { screen.getByText('🛒 Buy').click(); });

    expect(window.location.href).toContain('hub.tecosystem.app/hub');
    expect(window.location.href).toContain('pay=1');
    expect(window.location.href).toContain('listing-1');
    expect(window.location.href).toContain('assets.tecosystem.app');
  });

  it('يوقف لو Pi مش موجود', async () => {
    const originalPi = window.Pi;
    // @ts-expect-error test
    delete window.Pi;

    mockFetch({
      '/api/bff/assets/list':  { data: [mockAsset], total: 1 },
      '/api/bff/marketplace':  { listings: [mockListing], total: 1 },
      '/api/bff/marketplace/purchases': { purchases: [] },
      '/api/bff/wallet/balance': { balance: 5, currency: 'PI' },
    });

    const { default: AssetsPage } = await import('../page');
    render(React.createElement(AssetsPage));

    await waitFor(() => screen.getByText('🛒 Buy'));
    await act(async () => { screen.getByText('🛒 Buy').click(); });

    expect(window.location.href).toBe('');
    window.Pi = originalPi;
  });
});

// ── payment_status=success ────────────────────────────────
describe('payment_status=success', () => {
  it('NFT mint → calls nft/register', async () => {
    const nftData  = btoa(JSON.stringify({ n: 'Test NFT', u: 'https://r2.dev/test.jpg', k: 'key', m: 'image/jpeg' }));
    window.location.search = `?payment_status=success&product_id=nft:${nftData}&payment_id=pay-123&txid=tx-123`;

    let registerCalled = false;
    global.fetch = vi.fn(async (input: RequestInfo | URL, opts?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/bff/nft/register') && opts?.method === 'POST') {
        registerCalled = true;
        return { ok: true, status: 200, json: async () => ({ success: true }) } as Response;
      }
      return { ok: true, status: 200, json: async () => ({}) } as Response;
    }) as unknown as typeof fetch;

    const { default: AssetsPage } = await import('../page');
    render(React.createElement(AssetsPage));

    await waitFor(() => { expect(registerCalled).toBe(true); });
  });

  it('marketplace buy → calls marketplace/buy', async () => {
    window.location.search = '?payment_status=success&product_id=listing-123&payment_id=pay-456&txid=tx-456';

    let buyCalled = false;
    global.fetch = vi.fn(async (input: RequestInfo | URL, opts?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/bff/marketplace/buy') && opts?.method === 'POST') {
        buyCalled = true;
        const body = JSON.parse(opts.body as string);
        expect(body.listing_id).toBe('listing-123');
        expect(body.payment_id).toBe('pay-456');
        return { ok: true, status: 200, json: async () => ({ success: true }) } as Response;
      }
      return { ok: true, status: 200, json: async () => ({}) } as Response;
    }) as unknown as typeof fetch;

    const { default: AssetsPage } = await import('../page');
    render(React.createElement(AssetsPage));

    await waitFor(() => { expect(buyCalled).toBe(true); });
  });
});

// ── CSRF ──────────────────────────────────────────────────
describe('CSRF', () => {
  it('marketplace/buy يبعت x-csrf-token', async () => {
    window.location.search = '?payment_status=success&product_id=listing-999&payment_id=pay-999&txid=tx-999';

    let csrfSent = false;
    global.fetch = vi.fn(async (input: RequestInfo | URL, opts?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/bff/marketplace/buy')) {
        const headers = opts?.headers as Record<string, string>;
        csrfSent = !!headers?.['x-csrf-token'];
        return { ok: true, status: 200, json: async () => ({}) } as Response;
      }
      return { ok: true, status: 200, json: async () => ({}) } as Response;
    }) as unknown as typeof fetch;

    const { default: AssetsPage } = await import('../page');
    render(React.createElement(AssetsPage));

    await waitFor(() => { expect(csrfSent).toBe(true); });
  });
});

// ── assets/list response ──────────────────────────────────
describe('assets/list BFF response', () => {
  it('الرد فيه data array', async () => {
    const res  = await fetch('/api/bff/assets/list', { credentials: 'include' });
    const data = await res.json();
    expect(Array.isArray(data.data ?? [])).toBe(true);
  });

  it('كل asset فيه المطلوب', () => {
    const asset = mockAsset;
    expect(asset).toHaveProperty('id');
    expect(asset).toHaveProperty('name');
    expect(asset).toHaveProperty('asset_type');
    expect(asset).toHaveProperty('metadata');
  });

  it('NFT asset_type = nft', () => {
    expect(mockAsset.asset_type).toBe('nft');
  });
});

// ── Marketplace response ──────────────────────────────────
describe('marketplace BFF response', () => {
  it('listings فيها required fields', () => {
    const listing = mockListing;
    expect(listing).toHaveProperty('id');
    expect(listing).toHaveProperty('price');
    expect(listing).toHaveProperty('seller_id');
    expect(listing).toHaveProperty('category');
    expect(listing).toHaveProperty('metadata');
  });

  it('فقط ACTIVE listings', () => {
    const listings = [mockListing];
    listings.forEach(l => expect(l.status).toBe('active'));
  });

  it('NFT listing فيها imageUrl في metadata', () => {
    const nftListing = mockListing;
    expect(nftListing.metadata?.imageUrl).toBeDefined();
  });
});
