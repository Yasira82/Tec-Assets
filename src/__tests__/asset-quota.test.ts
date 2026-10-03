/**
 * A FREE plan at its asset cap cannot pay for a NEW asset (2026-10-03: a FREE owner
 * with 65 assets minted a 66th here — the cap lived only on the Hub's routes).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const GW = 'https://gw.internal';
const user = encodeURIComponent(JSON.stringify({ id: 'u1' }));

function stubGateway(opts: { sub?: unknown; subStatus?: number; owned?: number | null }) {
  const calls: string[] = [];
  const fetchMock = vi.fn(async (url: string) => {
    calls.push(url);
    if (url.includes('/api/commerce/subscriptions/status')) {
      return new Response(JSON.stringify({ success: true, data: { subscription: opts.sub ?? { plan: 'FREE', status: 'ACTIVE' } } }), { status: opts.subStatus ?? 200 });
    }
    if (url.includes('/api/assets/user/')) {
      if (opts.owned === null) return new Response('{}', { status: 500 });
      return new Response(JSON.stringify({ data: Array.from({ length: opts.owned ?? 0 }, (_, i) => ({ id: i })) }), { status: 200 });
    }
    if (url.includes('/api/payment/create')) {
      return new Response(JSON.stringify({ success: true, data: { payment: { id: 'pay-1' } } }), { status: 201 });
    }
    return new Response('{}', { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, calls };
}

const createReq = (product_id: string) => {
  const r = new NextRequest('https://assets.tecosystem.app/api/bff/payment/create', {
    method: 'POST', body: JSON.stringify({ amount: 1, product_id, memo: 'm' }),
  });
  r.cookies.set('tec_access_token', 'tok');
  r.cookies.set('tec_user', user);
  return r;
};

beforeEach(() => { vi.resetModules(); process.env.API_GATEWAY_URL = GW; });
afterEach(() => { vi.unstubAllGlobals(); });

describe('payment/create refuses a new asset over the FREE cap — before any π moves', () => {
  it('FREE with 65 assets: 402 UPGRADE_REQUIRED, and payment-service is never called', async () => {
    const { calls } = stubGateway({ owned: 65 });
    const { POST } = await import('@/app/api/bff/payment/create/route');
    const res = await POST(createReq('nft:abc'));
    expect(res.status).toBe(402);
    expect(await res.json()).toMatchObject({ code: 'UPGRADE_REQUIRED', limit: 5, owned: 65 });
    expect(calls.some((u) => u.includes('/api/payment/create'))).toBe(false);
  });

  it('a CANCELLED Pro counts as FREE', async () => {
    stubGateway({ sub: { plan: 'PRO', status: 'CANCELLED', isActive: false }, owned: 66 });
    const { POST } = await import('@/app/api/bff/payment/create/route');
    expect((await POST(createReq('nft:abc'))).status).toBe(402);
  });

  it('FREE under the cap is allowed', async () => {
    stubGateway({ owned: 4 });
    const { POST } = await import('@/app/api/bff/payment/create/route');
    expect((await POST(createReq('nft:abc'))).status).toBe(201);
  });

  it('a live PRO is unlimited', async () => {
    stubGateway({ sub: { plan: 'PRO', status: 'ACTIVE', isActive: true }, owned: 500 });
    const { POST } = await import('@/app/api/bff/payment/create/route');
    expect((await POST(createReq('nft:abc'))).status).toBe(201);
  });

  it('minting a domain the user already owns is not a new asset', async () => {
    const { calls } = stubGateway({ owned: 65 });
    const { POST } = await import('@/app/api/bff/payment/create/route');
    expect((await POST(createReq('domain-nft:00000000-0000-4000-8000-000000000000'))).status).toBe(201);
    expect(calls.some((u) => u.includes('/api/assets/user/'))).toBe(false);
  });

  it('an unreadable asset count lets the payment through (the Hub\'s fail-open on count)', async () => {
    stubGateway({ owned: null });
    const { POST } = await import('@/app/api/bff/payment/create/route');
    expect((await POST(createReq('nft:abc'))).status).toBe(201);
  });

  it('an unreadable plan is FREE (P6)', async () => {
    stubGateway({ subStatus: 503, owned: 9 });
    const { POST } = await import('@/app/api/bff/payment/create/route');
    expect((await POST(createReq('nft:abc'))).status).toBe(402);
  });
});

describe('GET /api/bff/assets/quota', () => {
  it('tells the upload screen the user is at the cap', async () => {
    stubGateway({ owned: 66 });
    const { GET } = await import('@/app/api/bff/assets/quota/route');
    const r = new NextRequest('https://assets.tecosystem.app/api/bff/assets/quota');
    r.cookies.set('tec_access_token', 'tok'); r.cookies.set('tec_user', user);
    expect(await (await GET(r)).json()).toEqual({ allowed: false, plan: 'FREE', limit: 5, owned: 66 });
  });

  it('no session → 401', async () => {
    stubGateway({});
    const { GET } = await import('@/app/api/bff/assets/quota/route');
    expect((await GET(new NextRequest('https://assets.tecosystem.app/api/bff/assets/quota'))).status).toBe(401);
  });
});
