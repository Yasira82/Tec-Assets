/**
 * Extended tests for usePiAuth hook
 * The Pi handshake on a visit belongs to PiVisitSignIn (app/layout.tsx), once per
 * page load. usePiAuth must never start one of its own (2026-10-03).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const mockGetStoredUser = vi.fn();
const mockLogout = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib-client/pi/pi-auth', () => ({
  getStoredUser: mockGetStoredUser,
  logout:        mockLogout,
}));

describe('usePiAuth extended', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: { href: '' },
    });
  });

  afterEach(() => {
    delete (window as any).__TEC_PI_READY;
    delete (window as any).Pi;
  });

  it('does not call Pi.authenticate when Pi is ready and a user is stored', async () => {
    const user = { id: 'u1', piUsername: 'yas55eR82', role: 'user', subscriptionPlan: 'Free' };
    mockGetStoredUser.mockReturnValue(user);

    const authenticateMock = vi.fn().mockResolvedValue({ accessToken: 'pi-tok' });
    (window as any).Pi = { authenticate: authenticateMock, createPayment: vi.fn() };
    (window as any).__TEC_PI_READY = true;

    const { usePiAuth } = await import('@/lib-client/hooks/usePiAuth');
    const { result } = renderHook(() => usePiAuth());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAuthenticated).toBe(true);
    // The visit handshake is PiVisitSignIn's — not this hook's.
    expect(authenticateMock).not.toHaveBeenCalled();
  });

  it('does not call Pi.authenticate on tec-pi-ready either', async () => {
    const user = { id: 'u2', piUsername: 'test2', role: 'user', subscriptionPlan: 'Free' };
    mockGetStoredUser.mockReturnValue(user);

    const authenticateMock = vi.fn().mockResolvedValue({ accessToken: 'pi-tok' });
    (window as any).Pi = { authenticate: authenticateMock, createPayment: vi.fn() };
    delete (window as any).__TEC_PI_READY;

    const { usePiAuth } = await import('@/lib-client/hooks/usePiAuth');
    const { result } = renderHook(() => usePiAuth());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      window.dispatchEvent(new Event('tec-pi-ready'));
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(authenticateMock).not.toHaveBeenCalled();
  });

  it('logout callback resets auth state', async () => {
    const user = { id: 'u3', piUsername: 'yas55eR82', role: 'user', subscriptionPlan: 'Free' };
    mockGetStoredUser.mockReturnValue(user);

    const { usePiAuth } = await import('@/lib-client/hooks/usePiAuth');
    const { result } = renderHook(() => usePiAuth());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(true);

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('stays authenticated from the stored user without asking Pi', async () => {
    const user = { id: 'u4', piUsername: 'yas55eR82', role: 'user', subscriptionPlan: 'Free' };
    mockGetStoredUser.mockReturnValue(user);

    const authenticateMock = vi.fn().mockRejectedValue(new Error('Pi not ready'));
    (window as any).Pi = { authenticate: authenticateMock, createPayment: vi.fn() };
    (window as any).__TEC_PI_READY = true;

    const { usePiAuth } = await import('@/lib-client/hooks/usePiAuth');
    const { result } = renderHook(() => usePiAuth());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAuthenticated).toBe(true);
    expect(authenticateMock).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });
});
