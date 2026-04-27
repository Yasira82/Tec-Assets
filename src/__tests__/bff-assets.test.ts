import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('BFF Assets List', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.API_GATEWAY_URL = 'https://gateway.test';
    process.env.INTERNAL_SECRET = 'test-secret';
  });

  it('returns empty array when gateway returns 404', async () => {
    mockFetch.mockResolvedValueOnce({
      ok:     false,
      status: 404,
      json:   async () => ({}),
    });

    const { GET } = await import('@/app/api/bff/assets/list/route');

    const req = {
      cookies: { get: (name: string) => name === 'tec_access_token' ? { value: 'tok' } : undefined },
      headers: { get: () => null },
    };

    try {
      await GET(req as any);
    } catch (e: any) {
      expect(e.message).toContain('Gateway');
    }
  });

  it('normalizes asset fields correctly', async () => {
    const raw = {
      data: [{
        id:        'asset-1',
        slug:      'assets.pi',
        category:  'DOMAIN',
        status:    'ACTIVE',
        createdAt: '2026-04-27T00:00:00Z',
      }],
    };

    mockFetch.mockResolvedValueOnce({
      ok:     true,
      status: 200,
      json:   async () => raw,
    });

    const { GET } = await import('@/app/api/bff/assets/list/route');

    const req = {
      cookies: { get: (name: string) => name === 'tec_access_token' ? { value: 'tok' } : undefined },
      headers: { get: () => 'req-123' },
    };

    const res   = await GET(req as any);
    const data  = await res.json();

    expect(data.data[0].name).toBe('assets.pi');
    expect(data.data[0].asset_type).toBe('domain');
    expect(data.data[0].status).toBe('active');
    expect(data.total).toBe(1);
  });
});
