/**
 * Tests for src/lib-client/pi/pi-auth.ts
 * Covers: isPiBrowser, getAccessToken, getRefreshToken, getStoredUser,
 *         waitForPiSDK, refreshAccessToken, fetchWithAuth, resolvePendingPayment
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── cookie helper ──────────────────────────────────────────
const mockCookie = (value: string) => {
  Object.defineProperty(document, 'cookie', {
    get: () => value,
    configurable: true,
  });
};

describe('isPiBrowser', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns false when window.Pi is not defined', async () => {
    const original = (window as any).Pi;
    delete (window as any).Pi;

    const { isPiBrowser } = await import('@/lib-client/pi/pi-auth');
    expect(isPiBrowser()).toBe(false);

    (window as any).Pi = original;
  });

  it('returns false when window.Pi has no authenticate function', async () => {
    (window as any).Pi = { createPayment: vi.fn() };

    const { isPiBrowser } = await import('@/lib-client/pi/pi-auth');
    expect(isPiBrowser()).toBe(false);

    delete (window as any).Pi;
  });

  it('returns true when window.Pi has authenticate function', async () => {
    (window as any).Pi = {
      authenticate:  vi.fn(),
      createPayment: vi.fn(),
    };

    const { isPiBrowser } = await import('@/lib-client/pi/pi-auth');
    expect(isPiBrowser()).toBe(true);

    delete (window as any).Pi;
  });
});

describe('getAccessToken', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns null when cookie is missing', async () => {
    mockCookie('');
    const { getAccessToken } = await import('@/lib-client/pi/pi-auth');
    expect(getAccessToken()).toBeNull();
  });

  it('returns null when other cookies exist but not tec_access_token', async () => {
    mockCookie('some_other=value; another=test');
    const { getAccessToken } = await import('@/lib-client/pi/pi-auth');
    expect(getAccessToken()).toBeNull();
  });

  it('returns token value when cookie is present', async () => {
    mockCookie('tec_access_token=my-token-value');
    const { getAccessToken } = await import('@/lib-client/pi/pi-auth');
    expect(getAccessToken()).toBe('my-token-value');
  });

  it('returns correct token when multiple cookies present', async () => {
    mockCookie('tec_csrf=csrf-abc; tec_access_token=tok-789; tec_user={}');
    const { getAccessToken } = await import('@/lib-client/pi/pi-auth');
    expect(getAccessToken()).toBe('tok-789');
  });
});

describe('getRefreshToken', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('always returns null', async () => {
    const { getRefreshToken } = await import('@/lib-client/pi/pi-auth');
    expect(getRefreshToken()).toBeNull();
  });

  it('still returns null even with cookies set', async () => {
    mockCookie('tec_refresh_token=some-value');
    const { getRefreshToken } = await import('@/lib-client/pi/pi-auth');
    expect(getRefreshToken()).toBeNull();
  });
});

describe('getStoredUser', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns null when no tec_user cookie', async () => {
    mockCookie('');
    const { getStoredUser } = await import('@/lib-client/pi/pi-auth');
    expect(getStoredUser()).toBeNull();
  });

  it('returns null when cookie is malformed JSON', async () => {
    mockCookie('tec_user=not-valid-json');
    const { getStoredUser } = await import('@/lib-client/pi/pi-auth');
    expect(getStoredUser()).toBeNull();
  });

  it('parses plain JSON user cookie', async () => {
    const user = { id: 'u1', piUsername: 'testuser', role: 'user' };
    mockCookie(`tec_user=${JSON.stringify(user)}`);
    const { getStoredUser } = await import('@/lib-client/pi/pi-auth');
    const result = getStoredUser() as typeof user;
    expect(result?.id).toBe('u1');
    expect(result?.piUsername).toBe('testuser');
  });

  it('parses URL-encoded JSON user cookie', async () => {
    const user = { id: 'u2', piUsername: 'encoded-user', role: 'admin' };
    mockCookie(`tec_user=${encodeURIComponent(JSON.stringify(user))}`);
    const { getStoredUser } = await import('@/lib-client/pi/pi-auth');
    const result = getStoredUser() as typeof user;
    expect(result?.piUsername).toBe('encoded-user');
    expect(result?.role).toBe('admin');
  });

  it('returns correct user when multiple cookies present', async () => {
    const user = { id: 'u3', piUsername: 'multi-cookie-user' };
    mockCookie(`tec_access_token=tok; tec_csrf=csrf; tec_user=${encodeURIComponent(JSON.stringify(user))}`);
    const { getStoredUser } = await import('@/lib-client/pi/pi-auth');
    const result = getStoredUser() as typeof user;
    expect(result?.id).toBe('u3');
  });
});

describe('waitForPiSDK', () => {
  beforeEach(() => {
    vi.resetModules();
    delete (window as any).Pi;
    (window as any).__TEC_PI_READY = false;
    (window as any).__TEC_PI_ERROR = false;
  });

  afterEach(() => {
    delete (window as any).__TEC_PI_READY;
    delete (window as any).__TEC_PI_ERROR;
    delete (window as any).Pi;
  });

  it('resolves immediately when Pi is defined and __TEC_PI_READY is true', async () => {
    (window as any).Pi = { authenticate: vi.fn(), createPayment: vi.fn() };
    (window as any).__TEC_PI_READY = true;

    const { waitForPiSDK } = await import('@/lib-client/pi/pi-auth');
    await expect(waitForPiSDK()).resolves.toBeUndefined();
  });

  it('rejects immediately when __TEC_PI_ERROR is true', async () => {
    (window as any).__TEC_PI_ERROR = true;

    const { waitForPiSDK } = await import('@/lib-client/pi/pi-auth');
    await expect(waitForPiSDK()).rejects.toThrow('Pi SDK failed to load.');
  });

  it('resolves when tec-pi-ready event fires', async () => {
    delete (window as any).__TEC_PI_READY;
    delete (window as any).__TEC_PI_ERROR;
    delete (window as any).Pi;

    const { waitForPiSDK } = await import('@/lib-client/pi/pi-auth');
    const promise = waitForPiSDK(5000);

    window.dispatchEvent(new Event('tec-pi-ready'));

    await expect(promise).resolves.toBeUndefined();
  });

  it('rejects when tec-pi-error event fires', async () => {
    delete (window as any).__TEC_PI_READY;
    delete (window as any).__TEC_PI_ERROR;
    delete (window as any).Pi;

    const { waitForPiSDK } = await import('@/lib-client/pi/pi-auth');
    const promise = waitForPiSDK(5000);

    window.dispatchEvent(new Event('tec-pi-error'));

    await expect(promise).rejects.toThrow('Pi SDK initialization failed.');
  });
});

describe('refreshAccessToken', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: { href: '' },
    });
    mockCookie('tec_access_token=test-token; tec_csrf=csrf-token');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('returns new token when refresh succeeds', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ token: 'new-access-token' }),
    } as unknown as Response);

    const { refreshAccessToken } = await import('@/lib-client/pi/pi-auth');
    const result = await refreshAccessToken();

    expect(result).toBe('new-access-token');
    expect(fetchSpy).toHaveBeenCalledWith('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
  });

  it('returns null when refresh response has no token field', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    } as unknown as Response);

    const { refreshAccessToken } = await import('@/lib-client/pi/pi-auth');
    const result = await refreshAccessToken();

    expect(result).toBeNull();
  });

  it('returns null when refresh response is not ok', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({}),
    } as unknown as Response);

    const { refreshAccessToken } = await import('@/lib-client/pi/pi-auth');
    const result = await refreshAccessToken();

    expect(result).toBeNull();
  });

  it('returns null when fetch throws', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('Network failure'));

    const { refreshAccessToken } = await import('@/lib-client/pi/pi-auth');
    const result = await refreshAccessToken();

    expect(result).toBeNull();
  });
});

describe('fetchWithAuth', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    mockCookie('tec_access_token=test-token; tec_csrf=csrf-token');
    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: { href: '' },
    });
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('returns response directly when not 401', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: 'ok' }),
    } as unknown as Response);

    const { fetchWithAuth } = await import('@/lib-client/pi/pi-auth');
    const res = await fetchWithAuth('/api/test');

    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('retries when response is 401 and refresh succeeds', async () => {
    const mockRes401 = { ok: false, status: 401, json: () => Promise.resolve({}) } as unknown as Response;
    const mockResOk  = { ok: true,  status: 200, json: () => Promise.resolve({}) } as unknown as Response;

    fetchSpy
      .mockResolvedValueOnce(mockRes401)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: 'refreshed-token' }),
      } as unknown as Response)
      .mockResolvedValueOnce(mockResOk);

    const { fetchWithAuth } = await import('@/lib-client/pi/pi-auth');
    const res = await fetchWithAuth('/api/protected');

    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it('returns 401 response when refresh fails', async () => {
    const mockRes401 = { ok: false, status: 401, json: () => Promise.resolve({}) } as unknown as Response;

    fetchSpy
      .mockResolvedValueOnce(mockRes401)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      } as unknown as Response);

    const { fetchWithAuth } = await import('@/lib-client/pi/pi-auth');
    const res = await fetchWithAuth('/api/protected');

    expect(res.status).toBe(401);
  });

  it('passes custom headers to the request', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    } as unknown as Response);

    const { fetchWithAuth } = await import('@/lib-client/pi/pi-auth');
    await fetchWithAuth('/api/test', {
      headers: { 'x-custom': 'custom-value' },
    });

    const [, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const headers = opts.headers as Record<string, string>;
    expect(headers['x-custom']).toBe('custom-value');
    expect(headers['Content-Type']).toBe('application/json');
  });
});

describe('resolvePendingPayment', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns { action: resolved } on success', async () => {
    const { resolvePendingPayment } = await import('@/lib-client/pi/pi-auth');
    const result = await resolvePendingPayment('pay-123');
    expect(result).toEqual({ action: 'resolved' });
  });
});
