import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('sdk — clearAuthToken + resolveIncomplete', () => {
  beforeEach(() => { vi.resetModules(); });

  it('sdk.clearAuthToken does not throw', async () => {
    const { sdk } = await import('@/lib/sdk');
    expect(() => sdk.clearAuthToken()).not.toThrow();
  });

  it('sdk.payment.resolveIncomplete returns skipped for any id', async () => {
    const { sdk } = await import('@/lib/sdk');
    const result = await sdk.payment.resolveIncomplete('any-payment-id');
    expect(result).toEqual({ status: 'skipped' });
  });
});

describe('getToken', () => {
  beforeEach(() => { vi.resetModules(); });

  it('returns null when no access token cookie', async () => {
    Object.defineProperty(document, 'cookie', {
      value: 'other=value',
      configurable: true, writable: true,
    });
    const { getToken } = await import('@/lib/sdk');
    expect(getToken()).toBeNull();
  });

  it('returns token when cookie present', async () => {
    Object.defineProperty(document, 'cookie', {
      value: 'tec_access_token=sdk-test-token',
      configurable: true, writable: true,
    });
    const { getToken } = await import('@/lib/sdk');
    expect(getToken()).toBe('sdk-test-token');
  });
});

describe('getUserId', () => {
  beforeEach(() => { vi.resetModules(); });

  it('returns null when no user cookie', async () => {
    Object.defineProperty(document, 'cookie', {
      value: '',
      configurable: true, writable: true,
    });
    const { getUserId } = await import('@/lib/sdk');
    expect(getUserId()).toBeNull();
  });

  it('returns id from user cookie', async () => {
    const user = { id: 'user-id-123', piUsername: 'testuser' };
    Object.defineProperty(document, 'cookie', {
      value: `tec_user=${encodeURIComponent(JSON.stringify(user))}`,
      configurable: true, writable: true,
    });
    const { getUserId } = await import('@/lib/sdk');
    expect(getUserId()).toBe('user-id-123');
  });

  it('returns uid fallback when id missing', async () => {
    const user = { uid: 'uid-456', piUsername: 'testuser2' };
    Object.defineProperty(document, 'cookie', {
      value: `tec_user=${encodeURIComponent(JSON.stringify(user))}`,
      configurable: true, writable: true,
    });
    const { getUserId } = await import('@/lib/sdk');
    expect(getUserId()).toBe('uid-456');
  });
});
