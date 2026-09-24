import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SignJWT } from 'jose';

// The three follow-ups the app makes after Pi reports a payment — buy a listing,
// mint a domain as an NFT, register an uploaded NFT. None of them may deliver on the
// browser's word: the asset-service delivers only against the payment's own
// `payment.completed.v1`. These tests pin the BFF's half of that: the user always
// comes from the verified session, no payment id is ever invented, and a 202
// "pending" from the asset-service reaches the browser as 202.

const USER    = '11111111-1111-4111-8111-111111111111';
const PAYMENT = '66666666-6666-4666-8666-666666666666';
const ASSET   = '55555555-5555-4555-8555-555555555555';

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const sessionToken = () =>
  new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setSubject(USER)
    .setExpirationTime('1h').sign(new TextEncoder().encode('test-jwt-secret'));

const makeRequest = (token: string, body: unknown) => ({
  cookies: { get: (n: string) => (n === 'tec_access_token' ? { value: token } : undefined), getAll: () => [] },
  headers: { get: (n: string) => (n === 'x-request-id' ? 'req-1' : null) },
  json:    async () => body,
  url:     'https://assets.tecosystem.app/api/bff/x',
});

const gatewayAnswers = (status: number, body: unknown) =>
  mockFetch.mockResolvedValue({ ok: status < 300, status, json: async () => body });

const callsTo = (fragment: string) =>
  mockFetch.mock.calls.filter(([url]) => String(url).includes(fragment));

describe('paid follow-ups — the BFF never delivers on the browser\'s word', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.API_GATEWAY_URL = 'https://gateway.test';
    process.env.INTERNAL_SECRET = 'test-secret';
    process.env.JWT_SECRET      = 'test-jwt-secret';
  });

  describe('POST /api/bff/nft/register', () => {
    it('claims the payment instead of provisioning an asset directly', async () => {
      gatewayAnswers(200, { success: true, status: 'applied' });
      const { POST } = await import('@/app/api/bff/nft/register/route');
      const res = await POST(makeRequest(await sessionToken(), {
        name: 'Sunset', imageUrl: 'https://cdn/x.png', paymentId: PAYMENT,
      }) as any);

      expect(res.status).toBe(200);
      expect(callsTo('/api/assets/provision')).toHaveLength(0);
      const [claim] = callsTo(`/api/assets/purchases/${PAYMENT}/claim`);
      expect(JSON.parse(claim[1].body)).toEqual({ userId: USER });
    });

    it('never invents a payment id — a non-UUID is refused, not replaced', async () => {
      gatewayAnswers(200, {});
      const { POST } = await import('@/app/api/bff/nft/register/route');
      const res = await POST(makeRequest(await sessionToken(), {
        name: 'Sunset', imageUrl: 'https://cdn/x.png', paymentId: 'pi_abc123',
      }) as any);

      expect(res.status).toBe(400);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('passes 202 "pending" through while the payment event has not landed', async () => {
      gatewayAnswers(202, { success: true, status: 'pending' });
      const { POST } = await import('@/app/api/bff/nft/register/route');
      const res = await POST(makeRequest(await sessionToken(), { paymentId: PAYMENT }) as any);
      expect(res.status).toBe(202);
    });
  });

  describe('POST /api/bff/assets/mint-as-nft', () => {
    it('reads asset_id — what the app actually sends — and takes the user from the session', async () => {
      gatewayAnswers(201, { success: true, status: 'applied' });
      const { POST } = await import('@/app/api/bff/assets/mint-as-nft/route');
      const res = await POST(makeRequest(await sessionToken(), {
        asset_id: ASSET, transactionId: PAYMENT, userId: 'someone-else',
      }) as any);

      expect(res.status).toBe(201);
      const [call] = callsTo(`/api/assets/${ASSET}/mint-as-nft`);
      expect(JSON.parse(call[1].body)).toEqual({ userId: USER, transactionId: PAYMENT });
    });

    it('refuses a caller without a session', async () => {
      const { POST } = await import('@/app/api/bff/assets/mint-as-nft/route');
      const res = await POST(makeRequest('not-a-jwt', { asset_id: ASSET, transactionId: PAYMENT }) as any);
      expect(res.status).toBe(401);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/bff/marketplace/buy', () => {
    it('names the buyer from the session and passes 202 "pending" through', async () => {
      gatewayAnswers(202, { success: true, status: 'pending' });
      const { POST } = await import('@/app/api/bff/marketplace/buy/route');
      const res = await POST(makeRequest(await sessionToken(), {
        listing_id: 'L-1', payment_id: PAYMENT,
      }) as any);

      expect(res.status).toBe(202);
      const [call] = callsTo('/api/assets/marketplace/L-1/buy');
      expect(JSON.parse(call[1].body)).toEqual({ buyerId: USER, paymentId: PAYMENT });
    });
  });
});
