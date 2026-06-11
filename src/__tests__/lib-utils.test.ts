import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateRequestId, storeRequestId, getLastRequestId, buildHeaders,
} from '@/lib/request-id';
import { goToTEC, TEC_ROUTES } from '@/lib/tec-navigation';
import { checkBackendHealth } from '@/lib/health-check';
import { isE2eMode, e2eStub } from '@/lib/server/e2e-mode';
import { fetchWithTimeout } from '@/lib/server/fetch-with-timeout';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('request-id', () => {
  beforeEach(() => {
    sessionStorage.clear();
    document.cookie = 'tec_access_token=test-token; tec_csrf=test-csrf';
  });

  it('generateRequestId returns a UUID', () => {
    const id = generateRequestId();
    expect(id).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('stores and retrieves last request id', () => {
    storeRequestId('req-abc');
    expect(getLastRequestId()).toBe('req-abc');
  });

  it('returns null when nothing stored', () => {
    expect(getLastRequestId()).toBeNull();
  });

  it('buildHeaders includes request id, auth, csrf and extras', () => {
    const headers = buildHeaders('tok-1', { 'X-Custom': 'yes' });
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['X-Request-ID']).toMatch(/^[0-9a-f-]{36}$/i);
    expect(headers.Authorization).toBe('Bearer tok-1');
    expect(headers['X-CSRF-Token']).toBe('test-csrf');
    expect(headers['X-Custom']).toBe('yes');
    expect(getLastRequestId()).toBe(headers['X-Request-ID']);
  });

  it('buildHeaders omits auth without token and csrf without cookie', () => {
    document.cookie = 'other=1';
    const headers = buildHeaders(null);
    expect(headers.Authorization).toBeUndefined();
    expect(headers['X-CSRF-Token']).toBeUndefined();
  });
});

describe('tec-navigation goToTEC', () => {
  beforeEach(() => {
    (window.location as any).replace = vi.fn();
    window.location.href = '';
  });

  it('HUB goes through SSO endpoint', () => {
    goToTEC('HUB');
    expect(window.location.href).toContain('/api/auth/sso?target=');
    expect(window.location.href).toContain(encodeURIComponent('https://tec-app-frontend.vercel.app'));
  });

  it('DASHBOARD uses location.replace with route', () => {
    goToTEC('DASHBOARD');
    expect((window.location as any).replace).toHaveBeenCalledWith(TEC_ROUTES.DASHBOARD);
  });

  it('SETTINGS uses location.replace', () => {
    goToTEC('SETTINGS');
    expect((window.location as any).replace).toHaveBeenCalledWith(TEC_ROUTES.SETTINGS);
  });
});

describe('checkBackendHealth', () => {
  it('online when status ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200, json: async () => ({ status: 'ok' }),
    });
    const res = await checkBackendHealth();
    expect(res.online).toBe(true);
    expect(res.status).toBe('ok');
  });

  it('prefers explicit online field', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200, json: async () => ({ online: true, status: 'degraded' }),
    });
    const res = await checkBackendHealth();
    expect(res.online).toBe(true);
  });

  it('offline when response not ok', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) });
    const res = await checkBackendHealth();
    expect(res.online).toBe(false);
    expect(res.error).toContain('503');
  });

  it('offline when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('unreachable'));
    const res = await checkBackendHealth();
    expect(res.online).toBe(false);
    expect(res.error).toBe('unreachable');
  });
});

describe('e2e-mode', () => {
  const saved: Record<string, string | undefined> = {};
  const keys = ['E2E_MODE', 'NEXT_PUBLIC_E2E_MODE', 'CI', 'E2E_ALLOW_NETWORK'];

  beforeEach(() => {
    for (const k of keys) { saved[k] = process.env[k]; delete process.env[k]; }
  });

  afterEach(() => {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it('false by default', () => {
    expect(isE2eMode()).toBe(false);
  });

  it('true when E2E_MODE=true', () => {
    process.env.E2E_MODE = 'true';
    expect(isE2eMode()).toBe(true);
  });

  it('true in CI without network allowance', () => {
    process.env.CI = 'true';
    expect(isE2eMode()).toBe(true);
  });

  it('false in CI with network allowance', () => {
    process.env.CI = 'true';
    process.env.E2E_ALLOW_NETWORK = 'true';
    expect(isE2eMode()).toBe(false);
  });

  it('e2eStub returns success body for 2xx', async () => {
    const res = e2eStub(200, { hello: 1 });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.hello).toBe(1);
  });

  it('e2eStub returns error body for non-2xx', async () => {
    const res = e2eStub(503);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('e2e-stub');
  });
});

describe('fetchWithTimeout', () => {
  it('passes through response and supplies an abort signal', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
    const res = await fetchWithTimeout('https://x.test/api', { method: 'GET' }, 1000);
    expect(res.ok).toBe(true);
    const init = mockFetch.mock.calls[mockFetch.mock.calls.length - 1][1];
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('propagates fetch rejection', async () => {
    mockFetch.mockRejectedValueOnce(new Error('aborted'));
    await expect(fetchWithTimeout('https://x.test', {}, 10)).rejects.toThrow('aborted');
  });
});
