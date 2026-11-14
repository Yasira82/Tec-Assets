/**
 * TEC-AUDIT-0012 — a listing price leaves tec-asset-service as a decimal STRING
 * ("3.5"), the C-71 §3 rule for an amount leaving a service, once its column is
 * DECIMAL(20,8). Until then it is a JS number.
 *
 * This app sends `listing.price` straight into a payment request, where ADR-009
 * requires a number — a string there fails the payment. So the BFF turns the price
 * into a number at its edge, whichever shape the service sends: this app can deploy
 * before or after the service and keep working.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { jwtVerify } from 'jose';
import { piAmount } from '@/lib/pi-amount';

vi.mock('jose', () => ({ jwtVerify: vi.fn() }));
const mockFetch = vi.fn();
global.fetch = mockFetch;

const req = (url: string) => ({
  cookies: {
    get:    (n: string) => (n === 'tec_access_token' ? { value: 't' } : undefined),
    getAll: () => [{ name: 'tec_access_token', value: 't' }],
  },
  headers: { get: () => null },
  url,
  json: async () => ({}),
});
const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

describe('piAmount', () => {
  it('reads a number or a decimal string as a number', () => {
    expect(piAmount(3)).toBe(3);
    expect(piAmount('3')).toBe(3);
    expect(piAmount('0.10000000')).toBe(0.1);
    expect(piAmount('999.12345678')).toBe(999.12345678);
  });
  it('anything that is not a finite amount is null — never a 0 price', () => {
    for (const v of [undefined, null, '', 'abc', NaN, Infinity, {}, '1e400']) expect(piAmount(v)).toBeNull();
  });
});

describe('the BFF gives the app a number for a decimal-string price', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.API_GATEWAY_URL = 'https://gateway.test';
    process.env.INTERNAL_SECRET = 'test-secret';
    process.env.JWT_SECRET      = 'test-jwt-secret-32chars-minimum';
    vi.mocked(jwtVerify).mockResolvedValue({ payload: { sub: 'user-123' } } as never);
  });

  it('GET /api/bff/marketplace', async () => {
    mockFetch.mockResolvedValueOnce(ok({ data: [
      { id: 'L1', assetId: 'A1', sellerId: 'S', price: '3.5', status: 'ACTIVE' },
      { id: 'L2', assetId: 'A2', sellerId: 'S', price: 4,     status: 'ACTIVE' },
      { id: 'L3', assetId: 'A3', sellerId: 'S', price: 'n/a', status: 'ACTIVE' },
    ] }));
    const { GET } = await import('@/app/api/bff/marketplace/route');
    const body = await (await GET(req('https://a.test/api/bff/marketplace') as never)).json();
    expect(body.listings.map((l: { price: unknown }) => l.price)).toEqual([3.5, 4]);
  });

  it('GET /api/bff/assets/list — value and listing_price', async () => {
    mockFetch
      .mockResolvedValueOnce(ok({ data: [{ id: 'A1', slug: 'x.pi', category: 'DOMAIN', status: 'ACTIVE', createdAt: '2026-01-01' }] }))
      .mockResolvedValueOnce(ok({ data: { listings: [{ id: 'L1', assetId: 'A1', status: 'ACTIVE', price: '7.25' }] } }));
    const { GET } = await import('@/app/api/bff/assets/list/route');
    const body = await (await GET(req('https://a.test/api/bff/assets/list') as never)).json();
    expect(body.data[0]).toMatchObject({ value: 7.25, listing_price: 7.25 });
  });

  it('GET /api/bff/marketplace/purchases', async () => {
    mockFetch
      .mockResolvedValueOnce(ok({ data: { purchases: [{ id: 'P1', price: '2.5', soldAt: '2026-11-01', asset: { slug: 'x.pi', category: 'DOMAIN' } }] } }))
      .mockResolvedValueOnce(ok({ data: [] }));
    const { GET } = await import('@/app/api/bff/marketplace/purchases/route');
    const body = await (await GET(req('https://a.test/api/bff/marketplace/purchases') as never)).json();
    expect(body.purchases[0].price).toBe(2.5);
  });
});
