import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock jose ─────────────────────────────────────────────
vi.mock('jose', () => ({
  jwtVerify: vi.fn(),
}));

import { jwtVerify } from 'jose';

const mockJwtVerify = vi.mocked(jwtVerify);

describe('SSO Callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects missing token', async () => {
    const { GET } = await import('@/app/api/auth/sso-callback/route');
    const req = new Request('https://tec-assets.vercel.app/api/auth/sso-callback');
    const res = await GET(req as any);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('/');
  });

  it('rejects invalid token', async () => {
    mockJwtVerify.mockRejectedValueOnce(new Error('invalid signature'));
    const { GET } = await import('@/app/api/auth/sso-callback/route');
    const req = new Request('https://tec-assets.vercel.app/api/auth/sso-callback?token=bad');
    const res = await GET(req as any);
    expect(res.status).toBe(307);
  });

  it('rejects replay — same jti twice', async () => {
    const payload = {
      sub:         'user-123',
      jti:         'unique-jti-abc',
      accessToken: 'tok_xxx',
      user:        { id: 'user-123', piUsername: 'yas55eR82' },
    };
    mockJwtVerify.mockResolvedValue({ payload } as any);

    vi.resetModules();
    const { GET } = await import('@/app/api/auth/sso-callback/route');

    const req1 = new Request('https://tec-assets.vercel.app/api/auth/sso-callback?token=valid');
    const res1 = await GET(req1 as any);
    expect(res1.status).toBe(307);
    expect(res1.headers.get('location')).toContain('/app');

    const req2 = new Request('https://tec-assets.vercel.app/api/auth/sso-callback?token=valid');
    const res2 = await GET(req2 as any);
    expect(res2.status).toBe(401);
  });

  it('sets cookies on valid token', async () => {
    const payload = {
      sub:         'user-123',
      jti:         'unique-jti-xyz',
      accessToken: 'tok_valid',
      user:        { id: 'user-123', piUsername: 'yas55eR82' },
    };
    mockJwtVerify.mockResolvedValue({ payload } as any);

    vi.resetModules();
    const { GET } = await import('@/app/api/auth/sso-callback/route');
    const req = new Request('https://tec-assets.vercel.app/api/auth/sso-callback?token=valid');
    const res = await GET(req as any);

    expect(res.status).toBe(307);
    const cookies = res.headers.getSetCookie?.() ?? [];
    expect(cookies.some((c: string) => c.includes('tec_access_token'))).toBe(true);
    expect(cookies.some((c: string) => c.includes('tec_user'))).toBe(true);
    expect(cookies.some((c: string) => c.includes('tec_csrf'))).toBe(true);
  });
});
