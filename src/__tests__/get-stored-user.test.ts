import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCookie = (value: string) => {
  Object.defineProperty(document, 'cookie', {
    get: () => value,
    configurable: true,
  });
};

describe('getStoredUser', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns null when no cookie', async () => {
    mockCookie('');
    const { getStoredUser } = await import('@/lib-client/pi/pi-auth');
    expect(getStoredUser()).toBeNull();
  });

  it('parses plain JSON cookie', async () => {
    const user = { id: 'u1', piUsername: 'yas55eR82' };
    mockCookie(`tec_user=${JSON.stringify(user)}`);
    const { getStoredUser } = await import('@/lib-client/pi/pi-auth');
    const result = getStoredUser();
    expect(result?.piUsername).toBe('yas55eR82');
  });

  it('parses encoded JSON cookie', async () => {
    const user = { id: 'u1', piUsername: 'yas55eR82' };
    mockCookie(`tec_user=${encodeURIComponent(JSON.stringify(user))}`);
    const { getStoredUser } = await import('@/lib-client/pi/pi-auth');
    const result = getStoredUser();
    expect(result?.piUsername).toBe('yas55eR82');
  });

  it('returns null on malformed cookie', async () => {
    mockCookie('tec_user=not_valid_json');
    const { getStoredUser } = await import('@/lib-client/pi/pi-auth');
    expect(getStoredUser()).toBeNull();
  });
});
