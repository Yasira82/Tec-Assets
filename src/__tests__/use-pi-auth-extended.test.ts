/**
 * Extended tests for usePiAuth hook
 * Targets uncovered lines: 37-39 (doSilentAuth), 44 (__TEC_PI_READY), 51-52 (logout state)
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

  it('calls doSilentAuth when Pi is ready and user is stored', async () => {
    const user = { id: 'u1', piUsername: 'yas55eR82', role: 'user', subscriptionPlan: 'Free' };
    mockGetStoredUser.mockReturnValue(user);

    const authenticateMock = vi.fn().mockResolvedValue({ accessToken: 'pi-tok' });
    (window as any).Pi = { authenticate: authenticateMock, createPayment: vi.fn() };
    (window as any).__TEC_PI_READY = true;

    const { usePiAuth } = await import('@/lib-client/hooks/usePiAuth');
    const { result } = renderHook(() => usePiAuth());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAuthenticated).toBe(true);
    // Silent auth should have been attempted
    expect(authenticateMock).toHaveBeenCalledWith(['username', 'payments'], expect.any(Function));
  });

  it('listens for tec-pi-ready event when __TEC_PI_READY is not set', async () => {
    const user = { id: 'u2', piUsername: 'test2', role: 'user', subscriptionPlan: 'Free' };
    mockGetStoredUser.mockReturnValue(user);

    const authenticateMock = vi.fn().mockResolvedValue({ accessToken: 'pi-tok' });
    (window as any).Pi = { authenticate: authenticateMock, createPayment: vi.fn() };
    delete (window as any).__TEC_PI_READY;

    const { usePiAuth } = await import('@/lib-client/hooks/usePiAuth');
    const { result } = renderHook(() => usePiAuth());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Fire the event to trigger silent auth
    act(() => {
      window.dispatchEvent(new Event('tec-pi-ready'));
    });

    await waitFor(() => expect(authenticateMock).toHaveBeenCalled(), { timeout: 1000 });
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

  it('handles Pi authenticate failure gracefully in silent auth', async () => {
    const user = { id: 'u4', piUsername: 'yas55eR82', role: 'user', subscriptionPlan: 'Free' };
    mockGetStoredUser.mockReturnValue(user);

    const authenticateMock = vi.fn().mockRejectedValue(new Error('Pi not ready'));
    (window as any).Pi = { authenticate: authenticateMock, createPayment: vi.fn() };
    (window as any).__TEC_PI_READY = true;

    const { usePiAuth } = await import('@/lib-client/hooks/usePiAuth');
    const { result } = renderHook(() => usePiAuth());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Should still be authenticated from stored user — silent auth failure is swallowed
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.error).toBeNull();
  });
});
