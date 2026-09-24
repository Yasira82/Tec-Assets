import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SignJWT } from 'jose';

// A property registered in TEC Estate showed in Assets with a 0π value, a Transfer
// button and "Delete NFT". It is stored in asset-service, but Estate owns its screens
// (C-114 §4) — Assets lists domains and NFTs, and its counters count only those.

const USER = '11111111-1111-4111-8111-111111111111';
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const token = () => new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setSubject(USER)
  .setExpirationTime('1h').sign(new TextEncoder().encode('test-jwt-secret'));

describe('GET /api/bff/assets/list — what Assets shows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.API_GATEWAY_URL = 'https://gateway.test';
    process.env.JWT_SECRET      = 'test-jwt-secret';
  });

  it('leaves properties to TEC Estate and keeps domains and NFTs', async () => {
    mockFetch.mockImplementation(async (url: string) => ({
      ok: true, status: 200,
      json: async () => String(url).includes('/listings')
        ? { data: { listings: [] } }
        : { data: [
            { id: 'd', slug: 'abc.pi',      category: 'DOMAIN',      status: 'ACTIVE', createdAt: '' },
            { id: 'n', slug: 'nft-1',       category: 'NFT',         status: 'ACTIVE', createdAt: '' },
            { id: 'p', slug: 'test-villa',  category: 'REAL_ESTATE', status: 'ACTIVE', createdAt: '' },
          ] },
    }));
    const { GET } = await import('@/app/api/bff/assets/list/route');
    const req = {
      cookies: { get: (n: string) => (n === 'tec_access_token' ? { value: '' } : undefined), getAll: () => [] },
      headers: { get: () => null },
      url: 'https://assets.tecosystem.app/api/bff/assets/list',
    };
    const t = await token();
    req.cookies.get = (n: string) => (n === 'tec_access_token' ? { value: t } : undefined);

    const res  = await GET(req as any);
    const body = await res.json() as { data: Array<{ id: string }>; total: number };

    expect(body.data.map((a) => a.id)).toEqual(['d', 'n']);
    expect(body.total).toBe(2);
  });
});
