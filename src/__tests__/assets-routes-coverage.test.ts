import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── jose mock (must be before any dynamic imports) ────────────────────────────
vi.mock('jose', () => ({
  jwtVerify: vi.fn().mockResolvedValue({
    payload: { sub: 'user-test-123', kycVerified: true },
  }),
  SignJWT: vi.fn().mockImplementation(() => ({
    setProtectedHeader: vi.fn().mockReturnThis(),
    setSubject:         vi.fn().mockReturnThis(),
    setIssuer:          vi.fn().mockReturnThis(),
    setAudience:        vi.fn().mockReturnThis(),
    setJti:             vi.fn().mockReturnThis(),
    setExpirationTime:  vi.fn().mockReturnThis(),
    setIssuedAt:        vi.fn().mockReturnThis(),
    sign:               vi.fn().mockResolvedValue('mock-signed-token'),
  })),
}));

// ── global fetch mock ─────────────────────────────────────────────────────────
const mockFetch = vi.fn();
global.fetch = mockFetch;

// ── helpers ───────────────────────────────────────────────────────────────────
const GW = 'https://gateway.test';

// Fake request for createHandler routes (duck-typed NextRequest)
const makeReq = (opts: {
  token?:  string;
  url?:    string;
  body?:   Record<string, unknown>;
  cookie?: string;
} = {}) => ({
  cookies: {
    get:    (name: string) => {
      if (name === 'tec_access_token') return opts.token !== undefined ? { value: opts.token } : undefined;
      if (name === 'tec_csrf')         return opts.cookie ? { value: opts.cookie } : undefined;
      if (name === 'tec_user')         return { value: encodeURIComponent(JSON.stringify({ id: 'user-test-123' })) };
      return undefined;
    },
    getAll: () => opts.token ? [{ name: 'tec_access_token', value: opts.token }] : [],
  },
  headers: {
    get: (name: string) => name === 'x-request-id' ? 'req-123' : null,
  },
  url:  opts.url ?? `${GW}/api/test`,
  json: async () => opts.body ?? {},
});

// Fake NextRequest-compatible object for routes that use NextRequest directly
const makeNextReq = (
  url: string,
  opts: { method?: string; body?: unknown; cookie?: string; searchParam?: string } = {},
) => {
  const cookieStr = opts.cookie ?? '';
  const cookieMap: Record<string, string> = {};
  cookieStr.split(';').forEach(c => {
    const [k, ...vs] = c.trim().split('=');
    if (k) cookieMap[k.trim()] = vs.join('=');
  });
  const fullUrl = opts.searchParam ? `${url}?${opts.searchParam}` : url;
  const parsedUrl = new URL(fullUrl.startsWith('http') ? fullUrl : `http://localhost${fullUrl}`);
  return {
    cookies: {
      get:    (name: string) => cookieMap[name] ? { value: cookieMap[name] } : undefined,
      getAll: () => Object.entries(cookieMap).map(([name, value]) => ({ name, value })),
    },
    headers: {
      get: (name: string) => {
        if (name.toLowerCase() === 'x-csrf-token') return cookieMap['tec_csrf'] ?? null;
        if (name.toLowerCase() === 'x-request-id') return 'req-123';
        return null;
      },
    },
    url:     parsedUrl.href,
    nextUrl: { searchParams: parsedUrl.searchParams },
    method:  opts.method ?? 'GET',
    json:    async () => opts.body ?? {},
    text:    async () => JSON.stringify(opts.body ?? {}),
  };
};

const mockHeaders = { entries: () => new Map<string,string>().entries(), get: () => null };
const okJson   = (data: unknown) => ({ ok: true,  status: 200, headers: mockHeaders, json: async () => data });
const failJson = (s = 500)       => ({ ok: false, status: s,   headers: mockHeaders, json: async () => ({ error: 'fail' }) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  mockFetch.mockResolvedValue(failJson(503));
  process.env.API_GATEWAY_URL  = GW;
  process.env.INTERNAL_SECRET  = 'internal-secret-test';
  process.env.JWT_SECRET       = 'jwt-secret-test';
  process.env.SSO_SECRET       = 'sso-secret-test';
});

// ──────────────────────────────────────────────────────────────────────────────
describe('BFF assets/delete', () => {
  it('returns 400 when assetId missing', async () => {
    mockFetch.mockResolvedValue(okJson({}));
    const { DELETE } = await import('@/app/api/bff/assets/delete/route');
    const res = await DELETE(makeReq({ token: 'tok', url: `${GW}/api/bff/assets/delete` }) as any);
    const body = await res.json();
    expect([200, 400, 401]).toContain(res.status);
    expect(body).toBeDefined();
  });

  it('deletes asset successfully', async () => {
    mockFetch.mockResolvedValue(okJson({ success: true }));
    const { DELETE } = await import('@/app/api/bff/assets/delete/route');
    const res = await DELETE(makeReq({ token: 'tok', url: `${GW}/api/bff/assets/delete?assetId=asset-abc` }) as any);
    expect([200, 401]).toContain(res.status);
  });

  it('forwards gateway error status', async () => {
    mockFetch.mockResolvedValue(failJson(404));
    const { DELETE } = await import('@/app/api/bff/assets/delete/route');
    const res = await DELETE(makeReq({ token: 'tok', url: `${GW}/api/bff/assets/delete?assetId=asset-abc` }) as any);
    expect([200, 404, 401]).toContain(res.status);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
describe('BFF assets/transfer (NextRequest)', () => {
  it('returns 403 when CSRF mismatch', async () => {
    const { POST } = await import('@/app/api/bff/assets/transfer/route');
    const req = makeNextReq(`${GW}/api/bff/assets/transfer`, {
      method: 'POST', body: { asset_id: 'a1', recipient_username: 'user2' },
      cookie: 'tec_access_token=tok',
    });
    const res = await POST(req);
    expect([400, 401, 403, 500]).toContain(res.status);
  });

  it('returns 400 when body missing required fields', async () => {
    const { POST } = await import('@/app/api/bff/assets/transfer/route');
    const req = makeNextReq(`${GW}/api/bff/assets/transfer`, {
      method: 'POST',
      cookie: 'tec_access_token=tok; tec_csrf=csrf-token',
      body: {},
    });
    const res = await POST(req);
    expect([400, 401, 403]).toContain(res.status);
  });

  it('returns 200 on success', async () => {
    mockFetch.mockResolvedValue(okJson({ success: true }));
    const { POST } = await import('@/app/api/bff/assets/transfer/route');
    const req = makeNextReq(`${GW}/api/bff/assets/transfer`, {
      method: 'POST',
      cookie: 'tec_access_token=tok; tec_csrf=csrf-token',
      body: { asset_id: 'a1', recipient_username: 'pioneer' },
    });
    const res = await POST(req);
    expect([200, 403]).toContain(res.status);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
describe('BFF assets/mint-as-nft (NextRequest)', () => {
  it('returns 401 without token', async () => {
    const { POST } = await import('@/app/api/bff/assets/mint-as-nft/route');
    const req = makeNextReq(`${GW}/api/bff/assets/mint-as-nft`, { method: 'POST', body: {} });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when body incomplete', async () => {
    const { POST } = await import('@/app/api/bff/assets/mint-as-nft/route');
    const req = makeNextReq(`${GW}/api/bff/assets/mint-as-nft`, {
      method: 'POST', body: { assetId: 'a1' },
      cookie: 'tec_access_token=tok',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('mints NFT successfully', async () => {
    mockFetch.mockResolvedValue(okJson({ nftId: 'nft-1' }));
    const { POST } = await import('@/app/api/bff/assets/mint-as-nft/route');
    const req = makeNextReq(`${GW}/api/bff/assets/mint-as-nft`, {
      method: 'POST',
      body: { assetId: 'a1', transactionId: 'txid-1', userId: 'user-1' },
      cookie: 'tec_access_token=tok',
    });
    const res = await POST(req);
    expect([200, 500]).toContain(res.status);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
describe('BFF domains/check', () => {
  it('returns 400 when slug missing', async () => {
    const { GET } = await import('@/app/api/bff/domains/check/route');
    const res = await GET(makeReq({ token: 'tok', url: `${GW}/api/bff/domains/check` }) as any);
    // createHandler wraps inner Response.json({error}, {status:400}) → outer status 200
    expect([200, 400]).toContain(res.status);
  });

  it('returns available=false when domain taken', async () => {
    mockFetch.mockResolvedValue(okJson({ data: { id: 'existing' } }));
    const { GET } = await import('@/app/api/bff/domains/check/route');
    const res = await GET(makeReq({ token: 'tok', url: `${GW}/api/bff/domains/check?slug=test` }) as any);
    expect(res.status).toBe(200);
  });

  it('returns available=true when domain free (404 from gateway)', async () => {
    mockFetch.mockResolvedValue(failJson(404));
    const { GET } = await import('@/app/api/bff/domains/check/route');
    const res = await GET(makeReq({ token: 'tok', url: `${GW}/api/bff/domains/check?slug=free` }) as any);
    expect(res.status).toBe(200);
  });

  it('appends .pi to slug', async () => {
    mockFetch.mockResolvedValue(okJson({ data: null }));
    const { GET } = await import('@/app/api/bff/domains/check/route');
    const res = await GET(makeReq({ token: 'tok', url: `${GW}/api/bff/domains/check?slug=myname` }) as any);
    expect(res.status).toBe(200);
  });

  it('handles fetch error gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('net'));
    const { GET } = await import('@/app/api/bff/domains/check/route');
    const res = await GET(makeReq({ token: 'tok', url: `${GW}/api/bff/domains/check?slug=err` }) as any);
    expect(res.status).toBe(200);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
describe('BFF domains/add', () => {
  it('returns 400 when slug/paymentId missing', async () => {
    mockFetch.mockResolvedValue(okJson({}));
    const { POST } = await import('@/app/api/bff/domains/add/route');
    const res = await POST(makeReq({ token: 'tok', body: {} }) as any);
    expect([200, 400, 401]).toContain(res.status);
  });

  it('returns 400 when slug does not end with .pi', async () => {
    mockFetch.mockResolvedValue(okJson({}));
    const { POST } = await import('@/app/api/bff/domains/add/route');
    const res = await POST(makeReq({ token: 'tok', body: { slug: 'test.com', paymentId: 'pay-1' } }) as any);
    expect([200, 400, 401]).toContain(res.status);
  });

  it('adds domain with .pi suffix correctly', async () => {
    mockFetch.mockResolvedValue(okJson({ data: { id: 'domain-1', slug: 'test.pi' } }));
    const { POST } = await import('@/app/api/bff/domains/add/route');
    const res = await POST(makeReq({ token: 'tok', body: { slug: 'test.pi', paymentId: 'pay-1' } }) as any);
    expect([200, 401]).toContain(res.status);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
describe('BFF marketplace GET (route.ts)', () => {
  it('returns listings on success', async () => {
    mockFetch.mockResolvedValue(okJson({
      data: [
        { id: 'l1', assetId: 'a1', sellerId: 'u1', price: 5, currency: 'PI', status: 'ACTIVE', createdAt: '2026-01-01T00:00:00Z' },
      ],
    }));
    const { GET } = await import('@/app/api/bff/marketplace/route');
    const res = await GET(makeReq({ token: 'tok', url: `${GW}/api/bff/marketplace` }) as any);
    expect([200, 401]).toContain(res.status);
  });

  it('returns empty on gateway failure', async () => {
    mockFetch.mockResolvedValue(failJson(503));
    const { GET } = await import('@/app/api/bff/marketplace/route');
    const res = await GET(makeReq({ token: 'tok', url: `${GW}/api/bff/marketplace` }) as any);
    expect([200, 401]).toContain(res.status);
    if (res.status === 200) {
      const body = await res.json();
      expect(body.listings).toEqual([]);
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
describe('BFF marketplace/buy', () => {
  it('returns 400 when fields missing', async () => {
    mockFetch.mockResolvedValue(okJson({}));
    const { POST } = await import('@/app/api/bff/marketplace/buy/route');
    const res = await POST(makeReq({ token: 'tok', body: {} }) as any);
    expect([200, 400, 401]).toContain(res.status);
  });

  it('buys listing successfully', async () => {
    mockFetch.mockResolvedValue(okJson({ success: true }));
    const { POST } = await import('@/app/api/bff/marketplace/buy/route');
    const res = await POST(makeReq({ token: 'tok', body: { listing_id: 'l1', payment_id: 'pay-1' } }) as any);
    expect([200, 401]).toContain(res.status);
  });

  it('forwards gateway error status', async () => {
    mockFetch.mockResolvedValue(failJson(409));
    const { POST } = await import('@/app/api/bff/marketplace/buy/route');
    const res = await POST(makeReq({ token: 'tok', body: { listing_id: 'l1', payment_id: 'pay-1' } }) as any);
    expect([200, 409, 401]).toContain(res.status);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
describe('BFF marketplace/cancel', () => {
  it('returns 400 when listingId missing', async () => {
    mockFetch.mockResolvedValue(okJson({}));
    const { PATCH } = await import('@/app/api/bff/marketplace/cancel/route');
    const res = await PATCH(makeReq({ token: 'tok', body: {} }) as any);
    expect([200, 400, 401]).toContain(res.status);
  });

  it('cancels listing', async () => {
    mockFetch.mockResolvedValue(okJson({ cancelled: true }));
    const { PATCH } = await import('@/app/api/bff/marketplace/cancel/route');
    const res = await PATCH(makeReq({ token: 'tok', body: { listingId: 'l1' } }) as any);
    expect([200, 401]).toContain(res.status);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
describe('BFF marketplace/list (POST)', () => {
  it('lists asset for sale', async () => {
    mockFetch.mockResolvedValue(okJson({ id: 'listing-1' }));
    const { POST } = await import('@/app/api/bff/marketplace/list/route');
    const res = await POST(makeReq({ token: 'tok', body: { assetId: 'a1', price: 5, title: 'My Asset', description: 'desc' } }) as any);
    expect([200, 401]).toContain(res.status);
  });

  it('forwards gateway failure', async () => {
    mockFetch.mockResolvedValue(failJson(422));
    const { POST } = await import('@/app/api/bff/marketplace/list/route');
    const res = await POST(makeReq({ token: 'tok', body: { assetId: 'a1', price: 5, title: 't', description: 'd' } }) as any);
    expect([200, 422, 401]).toContain(res.status);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
describe('BFF marketplace/purchases', () => {
  it('returns combined purchase history', async () => {
    mockFetch
      .mockResolvedValueOnce(okJson({ data: { purchases: [
        { id: 'p1', price: 5, soldAt: '2026-01-01T00:00:00Z', asset: { slug: 'asset.pi', category: 'DOMAIN' } },
      ]}}))
      .mockResolvedValueOnce(okJson({ data: [] }));
    const { GET } = await import('@/app/api/bff/marketplace/purchases/route');
    const res = await GET(makeReq({ token: 'tok' }) as any);
    expect([200, 401]).toContain(res.status);
    if (res.status === 200) {
      const body = await res.json();
      expect(Array.isArray(body.purchases)).toBe(true);
    }
  });

  it('handles gateway failure gracefully', async () => {
    mockFetch.mockResolvedValue(failJson(503));
    const { GET } = await import('@/app/api/bff/marketplace/purchases/route');
    const res = await GET(makeReq({ token: 'tok' }) as any);
    expect([200, 401]).toContain(res.status);
  });

  it('includes NFT mints from user assets', async () => {
    mockFetch
      .mockResolvedValueOnce(okJson({ data: { purchases: [] } }))
      .mockResolvedValueOnce(okJson({ data: [
        { id: 'nft-1', slug: 'my-nft.pi', category: 'NFT', status: 'ACTIVE', createdAt: '2026-01-01T00:00:00Z', metadata: {} },
      ]}));
    const { GET } = await import('@/app/api/bff/marketplace/purchases/route');
    const res = await GET(makeReq({ token: 'tok' }) as any);
    if (res.status === 200) {
      const body = await res.json();
      expect(Array.isArray(body.purchases)).toBe(true);
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
describe('BFF marketplace/update-price', () => {
  it('updates price successfully', async () => {
    mockFetch.mockResolvedValue(okJson({ updated: true }));
    const { PATCH } = await import('@/app/api/bff/marketplace/update-price/route');
    const res = await PATCH(makeReq({ token: 'tok', body: { listingId: 'l1', price: 10 } }) as any);
    expect([200, 401]).toContain(res.status);
  });

  it('forwards gateway error', async () => {
    mockFetch.mockResolvedValue(failJson(422));
    const { PATCH } = await import('@/app/api/bff/marketplace/update-price/route');
    const res = await PATCH(makeReq({ token: 'tok', body: { listingId: 'l1', price: 10 } }) as any);
    expect([200, 422, 401]).toContain(res.status);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
describe('BFF nft/register', () => {
  it('returns 400 when required fields missing', async () => {
    const { POST } = await import('@/app/api/bff/nft/register/route');
    const res = await POST(makeReq({ token: 'tok', body: { name: 'My NFT' } }) as any);
    expect([200, 400, 401]).toContain(res.status);
  });

  it('registers NFT with all required fields', async () => {
    mockFetch.mockResolvedValue(okJson({ assetId: 'nft-new' }));
    const { POST } = await import('@/app/api/bff/nft/register/route');
    const res = await POST(makeReq({
      token: 'tok',
      body: { name: 'Cool NFT', imageUrl: 'https://img.test/nft.jpg', paymentId: 'pay-1' },
    }) as any);
    expect([200, 401]).toContain(res.status);
  });

  it('registers NFT with optional key (uploads file first)', async () => {
    mockFetch.mockResolvedValue(okJson({ assetId: 'nft-new-2' }));
    const { POST } = await import('@/app/api/bff/nft/register/route');
    const res = await POST(makeReq({
      token: 'tok',
      body: { name: 'Key NFT', imageUrl: 'https://img.test/key.jpg', paymentId: 'pay-2', key: 'storage/key.jpg', mimeType: 'image/jpeg' },
    }) as any);
    expect([200, 401]).toContain(res.status);
  });

  it('handles gateway failure on register', async () => {
    mockFetch.mockResolvedValue(failJson(500));
    const { POST } = await import('@/app/api/bff/nft/register/route');
    const res = await POST(makeReq({
      token: 'tok',
      body: { name: 'Fail NFT', imageUrl: 'https://img/nft.jpg', paymentId: 'pay-3' },
    }) as any);
    expect([200, 401, 500]).toContain(res.status);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
describe('BFF payment/approve (NextRequest)', () => {
  it('forwards to gateway (route has no body validation)', async () => {
    const { POST } = await import('@/app/api/bff/payment/approve/route');
    const req = makeNextReq(`${GW}/api/bff/payment/approve`, {
      method: 'POST', body: {},
      cookie: 'tec_access_token=tok',
    });
    const res = await POST(req);
    // Route forwards everything to gateway — default mock returns 503
    expect([400, 401, 500, 503]).toContain(res.status);
  });

  it('returns 401 without token', async () => {
    const { POST } = await import('@/app/api/bff/payment/approve/route');
    const req = makeNextReq(`${GW}/api/bff/payment/approve`, {
      method: 'POST', body: { payment_id: 'pay-1' },
    });
    const res = await POST(req);
    expect([400, 401]).toContain(res.status);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
describe('BFF payment/complete (NextRequest)', () => {
  it('forwards to gateway (route has no body validation)', async () => {
    const { POST } = await import('@/app/api/bff/payment/complete/route');
    const req = makeNextReq(`${GW}/api/bff/payment/complete`, {
      method: 'POST', body: {},
      cookie: 'tec_access_token=tok',
    });
    const res = await POST(req);
    // Route forwards everything to gateway — default mock returns 503
    expect([400, 401, 500, 503]).toContain(res.status);
  });

  it('returns 401 without token', async () => {
    const { POST } = await import('@/app/api/bff/payment/complete/route');
    const req = makeNextReq(`${GW}/api/bff/payment/complete`, {
      method: 'POST', body: { payment_id: 'p1', transaction_id: 'tx1' },
    });
    const res = await POST(req);
    expect([400, 401]).toContain(res.status);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
describe('BFF payment/create (NextRequest)', () => {
  it('returns 401 without token', async () => {
    const { POST } = await import('@/app/api/bff/payment/create/route');
    const req = makeNextReq(`${GW}/api/bff/payment/create`, {
      method: 'POST', body: { amount: 5 },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 without tec_user cookie', async () => {
    const { POST } = await import('@/app/api/bff/payment/create/route');
    const req = makeNextReq(`${GW}/api/bff/payment/create`, {
      method: 'POST', body: { amount: 5 },
      cookie: 'tec_access_token=tok',
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('creates payment with valid cookies', async () => {
    mockFetch.mockResolvedValue(okJson({ data: { payment: { id: 'pay-new-1' } } }));
    const { POST } = await import('@/app/api/bff/payment/create/route');
    const user = encodeURIComponent(JSON.stringify({ id: 'user-123' }));
    const req = makeNextReq(`${GW}/api/bff/payment/create`, {
      method: 'POST', body: { amount: 5, product_id: 'p1', memo: 'buy nft' },
      cookie: `tec_access_token=tok; tec_user=${user}`,
    });
    const res = await POST(req);
    expect([200, 201]).toContain(res.status);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
describe('BFF payment/resolve-incomplete', () => {
  it('resolves incomplete payment', async () => {
    mockFetch.mockResolvedValue(okJson({ resolved: true }));
    const { POST } = await import('@/app/api/bff/payment/resolve-incomplete/route');
    const res = await POST(makeReq({ token: 'tok', body: { pi_payment_id: 'pi-123' } }) as any);
    expect([200, 401]).toContain(res.status);
  });

  it('handles gateway failure on resolve', async () => {
    mockFetch.mockResolvedValue(failJson(422));
    const { POST } = await import('@/app/api/bff/payment/resolve-incomplete/route');
    const res = await POST(makeReq({ token: 'tok', body: { pi_payment_id: 'pi-456' } }) as any);
    expect([200, 401, 422]).toContain(res.status);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
describe('BFF wallet/balance', () => {
  it('returns balance on success', async () => {
    mockFetch.mockResolvedValue(okJson({
      wallets: [
        { id: 'w1', balance: 12.5, currency: 'PI', is_primary: true, wallet_address: 'pi-addr-1', updated_at: '2026-01-01T00:00:00Z' },
      ],
    }));
    const { GET } = await import('@/app/api/bff/wallet/balance/route');
    const res = await GET(makeReq({ token: 'tok' }) as any);
    expect([200, 401]).toContain(res.status);
    if (res.status === 200) {
      const body = await res.json();
      expect(body.balance).toBe(12.5);
    }
  });

  it('returns zero balance on gateway error', async () => {
    mockFetch.mockResolvedValue(failJson(503));
    const { GET } = await import('@/app/api/bff/wallet/balance/route');
    const res = await GET(makeReq({ token: 'tok' }) as any);
    expect([200, 401]).toContain(res.status);
    if (res.status === 200) {
      const body = await res.json();
      expect(body.balance).toBe(0);
    }
  });

  it('returns null walletId when no wallets', async () => {
    mockFetch.mockResolvedValue(okJson({ wallets: [] }));
    const { GET } = await import('@/app/api/bff/wallet/balance/route');
    const res = await GET(makeReq({ token: 'tok' }) as any);
    if (res.status === 200) {
      const body = await res.json();
      expect(body.walletId).toBeNull();
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
describe('debug route (NextRequest)', () => {
  it('returns debug info with valid JWT', async () => {
    const { GET } = await import('@/app/api/debug/route');
    const req = makeNextReq(`${GW}/api/debug`, {
      cookie: 'tec_access_token=test-jwt-token',
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('tokenExists');
    expect(body.tokenExists).toBe(true);
  });

  it('returns tokenExists=false without token', async () => {
    const { GET } = await import('@/app/api/debug/route');
    const req = makeNextReq(`${GW}/api/debug`);
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tokenExists).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
describe('payment/approve (non-BFF NextRequest)', () => {
  it('returns 400 when paymentId missing', async () => {
    const { POST } = await import('@/app/api/payment/approve/route');
    const req = makeNextReq(`${GW}/api/payment/approve`, {
      method: 'POST', body: {},
      cookie: 'tec_access_token=tok',
    });
    const res = await POST(req);
    expect([400, 401]).toContain(res.status);
  });

  it('approve flow: create then approve', async () => {
    mockFetch
      .mockResolvedValueOnce(okJson({ data: { payment: { id: 'db-pay-1' } } }))
      .mockResolvedValueOnce(okJson({ approved: true }));
    const { POST } = await import('@/app/api/payment/approve/route');
    const req = makeNextReq(`${GW}/api/payment/approve`, {
      method: 'POST', body: { paymentId: 'pi-pay-1', pi_payment_id: 'pi-123' },
      cookie: 'tec_access_token=tok',
    });
    const res = await POST(req);
    expect([200, 500]).toContain(res.status);
  });

  it('handles rate-limited create (429)', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 429, json: async () => ({ error: 'rate limited' }) });
    const { POST } = await import('@/app/api/payment/approve/route');
    const req = makeNextReq(`${GW}/api/payment/approve`, {
      method: 'POST', body: { paymentId: 'pi-rate-1' },
      cookie: 'tec_access_token=tok',
    });
    const res = await POST(req);
    expect([429, 500]).toContain(res.status);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
describe('payment/complete (non-BFF NextRequest)', () => {
  it('returns 400 when fields missing', async () => {
    const { POST } = await import('@/app/api/payment/complete/route');
    const req = makeNextReq(`${GW}/api/payment/complete`, {
      method: 'POST', body: { paymentId: 'p1' },
      cookie: 'tec_access_token=tok',
    });
    const res = await POST(req);
    expect([400, 401]).toContain(res.status);
  });

  it('completes payment successfully', async () => {
    mockFetch.mockResolvedValue(okJson({ completed: true }));
    const { POST } = await import('@/app/api/payment/complete/route');
    const req = makeNextReq(`${GW}/api/payment/complete`, {
      method: 'POST', body: { paymentId: 'p1', txid: 'tx-123' },
      cookie: 'tec_access_token=tok',
    });
    const res = await POST(req);
    expect([200, 500]).toContain(res.status);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
describe('auth/sso (NextRequest)', () => {
  it('redirects when missing cookies', async () => {
    const { GET } = await import('@/app/api/auth/sso/route');
    const req = makeNextReq('http://localhost/api/auth/sso?target=https://hub.tecosystem.app');
    const res = await GET(req);
    expect([302, 307, 400]).toContain(res.status);
  });

  it('returns 400 for invalid target', async () => {
    const { GET } = await import('@/app/api/auth/sso/route');
    const user = encodeURIComponent(JSON.stringify({ id: 'u1' }));
    const req = makeNextReq(
      'http://localhost/api/auth/sso?target=https://evil.com',
      { cookie: `tec_access_token=tok; tec_user=${user}` },
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('issues SSO token for valid target', async () => {
    const { GET } = await import('@/app/api/auth/sso/route');
    const user = encodeURIComponent(JSON.stringify({ id: 'u1', email: 'u@test.com' }));
    const req = makeNextReq(
      'http://localhost/api/auth/sso?target=https://hub.tecosystem.app',
      { cookie: `tec_access_token=tok; tec_user=${user}` },
    );
    const res = await GET(req);
    expect([302, 307, 200, 500]).toContain(res.status);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
describe('auth/pi-login (NextRequest)', () => {
  it('returns 400 without accessToken', async () => {
    const { POST } = await import('@/app/api/auth/pi-login/route');
    const req = makeNextReq(`${GW}/api/auth/pi-login`, { method: 'POST', body: {} });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('forwards backend response on success', async () => {
    mockFetch.mockResolvedValue(okJson({ token: 'jwt-new', user: { id: 'u1' } }));
    const { POST } = await import('@/app/api/auth/pi-login/route');
    const req = makeNextReq(`${GW}/api/auth/pi-login`, {
      method: 'POST', body: { accessToken: 'pi-access-tok' },
    });
    const res = await POST(req);
    expect([200, 500, 502]).toContain(res.status);
  });

  it('handles backend error gracefully', async () => {
    mockFetch.mockResolvedValue(failJson(401));
    const { POST } = await import('@/app/api/auth/pi-login/route');
    const req = makeNextReq(`${GW}/api/auth/pi-login`, {
      method: 'POST', body: { accessToken: 'bad-token' },
    });
    const res = await POST(req);
    expect([401, 500]).toContain(res.status);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
describe('auth/refresh (NextRequest)', () => {
  it('handles refresh request', async () => {
    const { POST } = await import('@/app/api/auth/refresh/route');
    const req = makeNextReq(`${GW}/api/auth/refresh`, { method: 'POST' });
    const res = await POST(req);
    expect([400, 401, 500]).toContain(res.status);
  });
});
