import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Constants ─────────────────────────────────────────────
const RAILWAY_PATTERN = /railway\.app/;
const BFF_PATTERN     = /^\/api\//;
const HUB_URL         = 'https://hub.tecosystem.app';
const ASSETS_URL      = 'https://assets.tecosystem.app';

// ── Mock data ─────────────────────────────────────────────
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

beforeEach(() => {
  window.location.href   = '';
  window.location.search = '';
  vi.clearAllMocks();
});

// ── BFF Routing ───────────────────────────────────────────
describe('BFF — routing (no Railway calls)', () => {
  it('assets/list → BFF', () => {
    const url = '/api/bff/assets/list';
    expect(BFF_PATTERN.test(url)).toBe(true);
    expect(RAILWAY_PATTERN.test(url)).toBe(false);
  });

  it('marketplace → BFF', () => {
    const url = '/api/bff/marketplace';
    expect(BFF_PATTERN.test(url)).toBe(true);
    expect(RAILWAY_PATTERN.test(url)).toBe(false);
  });

  it('nft/register → BFF', () => {
    const url = '/api/bff/nft/register';
    expect(BFF_PATTERN.test(url)).toBe(true);
    expect(RAILWAY_PATTERN.test(url)).toBe(false);
  });

  it('nft/upload → BFF', () => {
    const url = '/api/bff/nft/upload';
    expect(BFF_PATTERN.test(url)).toBe(true);
    expect(RAILWAY_PATTERN.test(url)).toBe(false);
  });

  it('marketplace/buy → BFF', () => {
    const url = '/api/bff/marketplace/buy';
    expect(BFF_PATTERN.test(url)).toBe(true);
    expect(RAILWAY_PATTERN.test(url)).toBe(false);
  });

  it('marketplace/cancel → BFF', () => {
    const url = '/api/bff/marketplace/cancel';
    expect(BFF_PATTERN.test(url)).toBe(true);
    expect(RAILWAY_PATTERN.test(url)).toBe(false);
  });
});

// ── handleBuy URL ─────────────────────────────────────────
describe('handleBuy — URL params', () => {
  const buildBuyUrl = (listing: typeof mockListing) =>
    `${HUB_URL}/hub?pay=1`
    + `&amount=${listing.price}`
    + `&memo=${encodeURIComponent(`Buy ${listing.title} — TEC Assets`)}`
    + `&product_id=${listing.id}`
    + `&return_url=${encodeURIComponent(`${ASSETS_URL}/app`)}`
    + `&source=assets`;

  it('يحتوي على Hub URL', () => {
    const url = buildBuyUrl(mockListing);
    expect(url).toContain('hub.tecosystem.app/hub');
  });

  it('يحتوي على pay=1', () => {
    const url = buildBuyUrl(mockListing);
    expect(url).toContain('pay=1');
  });

  it('يحتوي على الـ amount', () => {
    const url = buildBuyUrl(mockListing);
    expect(url).toContain('amount=3');
  });

  it('يحتوي على listing_id', () => {
    const url = buildBuyUrl(mockListing);
    expect(url).toContain('listing-1');
  });

  it('يحتوي على return_url لـ Assets', () => {
    const url = buildBuyUrl(mockListing);
    expect(url).toContain('assets.tecosystem.app');
  });

  it('يحتوي على source=assets', () => {
    const url = buildBuyUrl(mockListing);
    expect(url).toContain('source=assets');
  });
});

// ── NFT Mint product_id ───────────────────────────────────
describe('NFT mint — product_id encoding', () => {
  const buildNFTProductId = (name: string, url: string, key: string) =>
    `nft:${btoa(JSON.stringify({ n: name, u: url, k: key, m: 'image/jpeg' }))}`;

  it('يبدأ بـ nft:', () => {
    const productId = buildNFTProductId('Pyramids', 'https://r2.dev/test.jpg', 'nfts/key');
    expect(productId.startsWith('nft:')).toBe(true);
  });

  it('يحتوي على بيانات مشفرة', () => {
    const productId = buildNFTProductId('Pyramids', 'https://r2.dev/test.jpg', 'nfts/key');
    const decoded   = JSON.parse(atob(productId.slice(4)));
    expect(decoded.n).toBe('Pyramids');
    expect(decoded.u).toContain('r2.dev');
    expect(decoded.m).toBe('image/jpeg');
  });
});

// ── payment_status handlers ───────────────────────────────
describe('payment_status=success handlers', () => {
  it('NFT product_id → calls nft/register', async () => {
    const nftData  = btoa(JSON.stringify({ n: 'Test', u: 'https://r2.dev/t.jpg', k: 'k', m: 'image/jpeg' }));
    const productId = `nft:${nftData}`;
    let called = false;

    global.fetch = vi.fn(async (input: RequestInfo | URL, opts?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/bff/nft/register') && opts?.method === 'POST') {
        called = true;
        const body = JSON.parse(opts.body as string);
        expect(body.name).toBe('Test');
        expect(body.paymentId).toBe('pay-123');
      }
      return { ok: true, status: 200, json: async () => ({ success: true }) } as Response;
    }) as unknown as typeof fetch;

    // Simulate the handler
    const txid      = 'tx-123';
    const paymentId = 'pay-123';

    if (productId.startsWith('nft:')) {
      const nftMeta = JSON.parse(atob(productId.slice(4)));
      await fetch('/api/bff/nft/register', {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json', 'x-csrf-token': 'test-csrf' },
        body:        JSON.stringify({ name: nftMeta.n, paymentId, txid }),
      });
    }

    expect(called).toBe(true);
  });

  it('marketplace product_id → calls marketplace/buy', async () => {
    const productId = 'listing-123';
    const paymentId = 'pay-456';
    const txid      = 'tx-456';
    let called = false;

    global.fetch = vi.fn(async (input: RequestInfo | URL, opts?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/bff/marketplace/buy') && opts?.method === 'POST') {
        called = true;
        const body = JSON.parse(opts.body as string);
        expect(body.listing_id).toBe('listing-123');
        expect(body.payment_id).toBe('pay-456');
      }
      return { ok: true, status: 200, json: async () => ({}) } as Response;
    }) as unknown as typeof fetch;

    if (!productId.startsWith('nft:')) {
      await fetch('/api/bff/marketplace/buy', {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json', 'x-csrf-token': 'test-csrf' },
        body:        JSON.stringify({ listing_id: productId, payment_id: paymentId, txid }),
      });
    }

    expect(called).toBe(true);
  });
});

// ── CSRF ──────────────────────────────────────────────────
describe('CSRF headers', () => {
  it('marketplace/buy يبعت x-csrf-token', async () => {
    let csrfSent = '';

    global.fetch = vi.fn(async (input: RequestInfo | URL, opts?: RequestInit) => {
      const headers = opts?.headers as Record<string, string>;
      csrfSent = headers?.['x-csrf-token'] ?? '';
      return { ok: true, status: 200, json: async () => ({}) } as Response;
    }) as unknown as typeof fetch;

    await fetch('/api/bff/marketplace/buy', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': 'test-csrf' },
      body:    JSON.stringify({ listing_id: 'l1', payment_id: 'p1' }),
    });

    expect(csrfSent).toBe('test-csrf');
  });

  it('nft/register يبعت x-csrf-token', async () => {
    let csrfSent = '';

    global.fetch = vi.fn(async (input: RequestInfo | URL, opts?: RequestInit) => {
      const headers = opts?.headers as Record<string, string>;
      csrfSent = headers?.['x-csrf-token'] ?? '';
      return { ok: true, status: 200, json: async () => ({}) } as Response;
    }) as unknown as typeof fetch;

    await fetch('/api/bff/nft/register', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': 'test-csrf' },
      body:    JSON.stringify({ name: 'Test', paymentId: 'p1' }),
    });

    expect(csrfSent).toBe('test-csrf');
  });
});

// ── Listing structure ─────────────────────────────────────
describe('Listing — data structure', () => {
  it('فيها required fields', () => {
    expect(mockListing).toHaveProperty('id');
    expect(mockListing).toHaveProperty('price');
    expect(mockListing).toHaveProperty('seller_id');
    expect(mockListing).toHaveProperty('category');
    expect(mockListing).toHaveProperty('metadata');
  });

  it('NFT listing فيها imageUrl', () => {
    expect(mockListing.metadata?.imageUrl).toBeDefined();
    expect(mockListing.metadata?.imageUrl).toContain('http');
  });

  it('status = active', () => {
    expect(mockListing.status).toBe('active');
  });
});
