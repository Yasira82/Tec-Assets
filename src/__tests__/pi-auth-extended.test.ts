import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Tests for uncovered functions in src/lib-client/pi/pi-auth.ts

describe('getAccessToken', () => {
  beforeEach(() => { vi.resetModules(); });

  it('returns null when cookie missing', async () => {
    Object.defineProperty(document, 'cookie', { value: '', configurable: true, writable: true });
    const { getAccessToken } = await import('@/lib-client/pi/pi-auth');
    expect(getAccessToken()).toBeNull();
  });

  it('returns token value when cookie present', async () => {
    Object.defineProperty(document, 'cookie', {
      value: 'tec_access_token=tok-abc123; other=x',
      configurable: true, writable: true,
    });
    const { getAccessToken } = await import('@/lib-client/pi/pi-auth');
    expect(getAccessToken()).toBe('tok-abc123');
  });
});

describe('isPiBrowser', () => {
  beforeEach(() => { vi.resetModules(); });

  it('returns false when window.Pi is undefined', async () => {
    delete (window as any).Pi;
    const { isPiBrowser } = await import('@/lib-client/pi/pi-auth');
    expect(isPiBrowser()).toBe(false);
  });

  it('returns false when Pi has no authenticate function', async () => {
    (window as any).Pi = { init: vi.fn() };
    const { isPiBrowser } = await import('@/lib-client/pi/pi-auth');
    expect(isPiBrowser()).toBe(false);
    delete (window as any).Pi;
  });

  it('returns true when Pi.authenticate is a function', async () => {
    (window as any).Pi = { authenticate: vi.fn() };
    const { isPiBrowser } = await import('@/lib-client/pi/pi-auth');
    expect(isPiBrowser()).toBe(true);
    delete (window as any).Pi;
  });
});

describe('getRefreshToken', () => {
  it('always returns null', async () => {
    const { getRefreshToken } = await import('@/lib-client/pi/pi-auth');
    expect(getRefreshToken()).toBeNull();
  });
});

describe('refreshAccessToken', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      configurable: true, writable: true,
    });
  });

  it('returns token on successful refresh', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({ token: 'new-token-xyz' }),
    } as Response);

    const { refreshAccessToken } = await import('@/lib-client/pi/pi-auth');
    const token = await refreshAccessToken();
    expect(token).toBe('new-token-xyz');
  });

  it('returns null and redirects on failed refresh', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false, status: 401,
      json: async () => ({}),
    } as Response);

    const { refreshAccessToken } = await import('@/lib-client/pi/pi-auth');
    const token = await refreshAccessToken();
    expect(token).toBeNull();
  });

  it('returns null when fetch throws', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    const { refreshAccessToken } = await import('@/lib-client/pi/pi-auth');
    const token = await refreshAccessToken();
    expect(token).toBeNull();
  });
});

describe('fetchWithAuth', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    Object.defineProperty(document, 'cookie', {
      value: 'tec_access_token=valid-token',
      configurable: true, writable: true,
    });
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      configurable: true, writable: true,
    });
  });

  it('returns response on 200', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({ data: 'ok' }),
    } as Response);

    const { fetchWithAuth } = await import('@/lib-client/pi/pi-auth');
    const res = await fetchWithAuth('/api/bff/some-route');
    expect(res.status).toBe(200);
  });

  it('retries with new token on 401', async () => {
    const mock401 = { ok: false, status: 401, json: async () => ({}) } as Response;
    const mock200 = { ok: true,  status: 200, json: async () => ({ data: 'ok' }) } as Response;
    const mockRefresh = { ok: true, status: 200, json: async () => ({ token: 'refreshed-token' }) } as Response;

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(mock401)    // initial request → 401
      .mockResolvedValueOnce(mockRefresh) // refresh token call
      .mockResolvedValueOnce(mock200);   // retry request

    const { fetchWithAuth } = await import('@/lib-client/pi/pi-auth');
    const res = await fetchWithAuth('/api/bff/some-route');
    expect(res.status).toBe(200);
  });
});

describe('resolvePendingPayment', () => {
  beforeEach(() => { vi.resetModules(); });

  it('returns resolved action on success', async () => {
    const { resolvePendingPayment } = await import('@/lib-client/pi/pi-auth');
    const result = await resolvePendingPayment('pi-payment-id-123');
    expect(result).toEqual({ action: 'resolved' });
  });
});
