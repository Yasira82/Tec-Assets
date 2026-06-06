/**
 * Extended tests for src/app/api/bff/assets/list/route.ts
 * Targets uncovered lines 20-30 (estimateValue), 36-89 (GET handler logic)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { jwtVerify } from 'jose';

vi.mock('jose', () => ({
  jwtVerify: vi.fn(),
}));

const mockJwtVerify = vi.mocked(jwtVerify);

const mockFetch = vi.fn();
global.fetch = mockFetch;

const makeAuthRequest = (token = 'valid-token') => ({
  cookies: {
    get:    (name: string) => name === 'tec_access_token' ? { value: token } : undefined,
    getAll: () => [{ name: 'tec_access_token', value: token }],
  },
  headers: {
    get: (_name: string) => null,
  },
  url: 'https://tec-assets.vercel.app/api/bff/assets/list',
  json: async () => ({}),
});

describe('BFF Assets List — estimateValue and handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.API_GATEWAY_URL = 'https://gateway.test';
    process.env.INTERNAL_SECRET = 'test-secret';
    process.env.JWT_SECRET      = 'test-jwt-secret-32chars-minimum';

    // Make JWT verification succeed
    mockJwtVerify.mockResolvedValue({
      payload: { sub: 'user-123', kycVerified: true },
    } as any);
  });

  it('returns empty data when assets endpoint fails', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })  // assets
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) }); // listings

    const { GET } = await import('@/app/api/bff/assets/list/route');
    const res     = await GET(makeAuthRequest() as any);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data).toEqual([]);
    expect(data.total).toBe(0);
  });

  it('normalizes domain asset with long slug to value 1', async () => {
    const rawAsset = {
      id:        'asset-domain-long',
      slug:      'averylongdomainname.pi',
      category:  'domain',
      status:    'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({ data: [rawAsset] }),
      })
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({ data: { listings: [] } }),
      });

    const { GET } = await import('@/app/api/bff/assets/list/route');
    const res     = await GET(makeAuthRequest() as any);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.total).toBe(1);
    expect(data.data[0].value).toBe(1);   // long name → value 1
    expect(data.data[0].asset_type).toBe('domain');
  });

  it('normalizes domain asset with short (≤3 char) slug to value 5', async () => {
    const rawAsset = {
      id:        'asset-short',
      slug:      'ab.pi',
      category:  'domain',
      status:    'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({ data: [rawAsset] }),
      })
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({ data: { listings: [] } }),
      });

    const { GET } = await import('@/app/api/bff/assets/list/route');
    const res     = await GET(makeAuthRequest() as any);

    const data = await res.json();
    expect(data.data[0].value).toBe(5);   // ≤3 chars → value 5
  });

  it('normalizes domain asset with 4-5 char slug to value 3', async () => {
    const rawAsset = {
      id:        'asset-mid',
      slug:      'abcd.pi',
      category:  'domain',
      status:    'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({ data: [rawAsset] }),
      })
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({ data: { listings: [] } }),
      });

    const { GET } = await import('@/app/api/bff/assets/list/route');
    const res     = await GET(makeAuthRequest() as any);

    const data = await res.json();
    expect(data.data[0].value).toBe(3);   // 4-5 chars → value 3
  });

  it('normalizes domain asset with 6-9 char slug to value 2', async () => {
    const rawAsset = {
      id:        'asset-med',
      slug:      'abcdefg.pi',
      category:  'domain',
      status:    'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({ data: [rawAsset] }),
      })
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({ data: { listings: [] } }),
      });

    const { GET } = await import('@/app/api/bff/assets/list/route');
    const res     = await GET(makeAuthRequest() as any);

    const data = await res.json();
    expect(data.data[0].value).toBe(2);   // 6-9 chars → value 2
  });

  it('uses active listing price when available', async () => {
    const rawAsset = {
      id:        'asset-listed',
      slug:      'mylisting.pi',
      category:  'domain',
      status:    'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
    };

    const activeListing = {
      id:      'listing-1',
      assetId: 'asset-listed',
      status:  'ACTIVE',
      price:   10,
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({ data: [rawAsset] }),
      })
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({ data: { listings: [activeListing] } }),
      });

    const { GET } = await import('@/app/api/bff/assets/list/route');
    const res     = await GET(makeAuthRequest() as any);

    const data = await res.json();
    expect(data.data[0].value).toBe(10);       // listing price takes precedence
    expect(data.data[0].listing_id).toBe('listing-1');
    expect(data.data[0].listing_price).toBe(10);
  });

  it('normalizes NFT asset to value 2', async () => {
    const rawAsset = {
      id:        'asset-nft',
      slug:      'my-nft',
      category:  'nft',
      status:    'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({ data: [rawAsset] }),
      })
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({ data: { listings: [] } }),
      });

    const { GET } = await import('@/app/api/bff/assets/list/route');
    const res     = await GET(makeAuthRequest() as any);

    const data = await res.json();
    expect(data.data[0].value).toBe(2);         // nft → value 2
    expect(data.data[0].asset_type).toBe('nft');
  });

  it('uses metadata.name when available as asset name', async () => {
    const rawAsset = {
      id:        'asset-name',
      slug:      'fallback-slug.pi',
      category:  'domain',
      status:    'ACTIVE',
      metadata:  { name: 'My Named Asset' },
      createdAt: '2026-01-01T00:00:00Z',
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({ data: [rawAsset] }),
      })
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({ data: { listings: [] } }),
      });

    const { GET } = await import('@/app/api/bff/assets/list/route');
    const res     = await GET(makeAuthRequest() as any);

    const data = await res.json();
    expect(data.data[0].name).toBe('My Named Asset');
  });

  it('falls back to slug when metadata.name is not set', async () => {
    const rawAsset = {
      id:        'asset-no-name',
      slug:      'slugname.pi',
      category:  'domain',
      status:    'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({ data: [rawAsset] }),
      })
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({ data: { listings: [] } }),
      });

    const { GET } = await import('@/app/api/bff/assets/list/route');
    const res     = await GET(makeAuthRequest() as any);

    const data = await res.json();
    expect(data.data[0].name).toBe('slugname.pi');
  });
});
